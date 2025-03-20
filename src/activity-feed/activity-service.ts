// src/modules/activity/activity.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { Activity, ActivityType, ActivityPrivacy, ActivityTarget } from './schemas/activity.schema';
import { User } from '../user/schemas/user.schema';
import { FollowService } from '../follow/follow.service';
import { BlockService } from '../block/block.service';
import { ActivityFeedDto } from './dto/activity-feed.dto';
import { RecordActivityDto } from './dto/record-activity.dto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);
  private readonly FEED_CACHE_TTL = 300; // 5 minutes in seconds
  private readonly FEED_CACHE_PREFIX = 'activity_feed:';
  
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<Activity>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private followService: FollowService,
    private blockService: BlockService,
  ) {}

  /**
   * Record a new activity
   */
  async recordActivity(dto: RecordActivityDto): Promise<Activity> {
    try {
      // Generate group key for similar activities if needed
      let groupKey = null;
      if (dto.groupWithSimilar) {
        groupKey = this.generateGroupKey(dto.userId, dto.type, dto.target);
      }

      // Create new activity
      const activity = new this.activityModel({
        userId: dto.userId,
        type: dto.type,
        target: dto.target,
        metadata: dto.metadata || {},
        privacy: dto.privacy || ActivityPrivacy.PUBLIC,
        groupKey,
        createdAt: new Date(),
      });

      // Save activity
      await activity.save();

      // Invalidate cached feeds that might include this activity
      await this.invalidateRelevantCaches(dto.userId, dto.type);

      return activity;
    } catch (error) {
      this.logger.error(`Error recording activity: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate a personalized activity feed for a user
   */
  async getPersonalizedFeed(
    userId: string,
    options: ActivityFeedDto,
  ): Promise<{ activities: Activity[]; total: number; hasMore: boolean }> {
    try {
      const cacheKey = this.generateCacheKey(userId, options);
      
      // Try to get from cache first
      const cachedFeed = await this.cacheManager.get(cacheKey);
      if (cachedFeed && !options.skipCache) {
        return cachedFeed as any;
      }
      
      // Get users that the current user follows
      const following = await this.followService.getFollowingIds(userId);
      
      // Get users that have blocked the current user or are blocked by the current user
      const blockedUsers = await this.blockService.getMutualBlockIds(userId);
      
      // Build query
      const { pipeline, countPipeline } = this.buildFeedPipeline(
        userId,
        following,
        blockedUsers,
        options,
      );
      
      // Execute aggregation
      const activities = await this.activityModel.aggregate(pipeline);
      
      // Get total count (for pagination)
      const countResult = await this.activityModel.aggregate(countPipeline);
      const total = countResult[0]?.count || 0;
      
      // Process activities (populate references, apply grouping, etc)
      const processedActivities = await this.processActivities(activities);
      
      // Determine if there are more activities
      const hasMore = (options.page * options.limit) < total;
      
      // Prepare result
      const result = {
        activities: processedActivities,
        total,
        hasMore,
      };
      
      // Cache result
      await this.cacheManager.set(cacheKey, result, this.FEED_CACHE_TTL);
      
      return result;
    } catch (error) {
      this.logger.error(`Error generating feed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get activities for a specific user
   */
  async getUserActivities(
    viewerId: string,
    userId: string,
    options: ActivityFeedDto,
  ): Promise<{ activities: Activity[]; total: number; hasMore: boolean }> {
    try {
      // Check if viewer is blocked by user
      const isBlocked = await this.blockService.isBlockedBy(viewerId, userId);
      if (isBlocked) {
        return { activities: [], total: 0, hasMore: false };
      }
      
      // Determine privacy level based on relationship
      let privacyLevels = [ActivityPrivacy.PUBLIC];
      
      if (viewerId === userId) {
        // User viewing their own activities can see everything
        privacyLevels = Object.values(ActivityPrivacy);
      } else {
        // Check if viewer follows user
        const viewerFollowsUser = await this.followService.isFollowing(viewerId, userId);
        if (viewerFollowsUser) {
          privacyLevels.push(ActivityPrivacy.FOLLOWERS);
          
          // Check if user also follows viewer (friends)
          const userFollowsViewer = await this.followService.isFollowing(userId, viewerId);
          if (userFollowsViewer) {
            privacyLevels.push(ActivityPrivacy.FRIENDS);
          }
        }
      }
      
      // Build query
      const query: any = {
        userId: new Types.ObjectId(userId),
        privacy: { $in: privacyLevels },
      };
      
      // Apply filters
      if (options.types && options.types.length > 0) {
        query.type = { $in: options.types };
      }
      
      if (options.fromDate) {
        query.createdAt = { $gte: new Date(options.fromDate) };
      }
      
      if (options.toDate) {
        query.createdAt = { 
          ...query.createdAt,
          $lte: new Date(options.toDate) 
        };
      }
      
      // Get total count
      const total = await this.activityModel.countDocuments(query);
      
      // Get activities with pagination
      const activities = await this.activityModel
        .find(query)
        .populate('userId', 'username profile.avatar')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec();
      
      // Process activities
      const processedActivities = await this.processActivities(activities);
      
      // Determine if there are more activities
      const hasMore = (options.page * options.limit) < total;
      
      return {
        activities: processedActivities,
        total,
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Error getting user activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get activities related to a specific content item
   */
  async getContentActivities(
    viewerId: string,
    contentType: string,
    contentId: string,
    options: ActivityFeedDto,
  ): Promise<{ activities: Activity[]; total: number; hasMore: boolean }> {
    try {
      // Get blocked users
      const blockedUsers = await this.blockService.getMutualBlockIds(viewerId);
      
      // Build query
      const query: any = {
        'target.type': contentType,
        'target.id': contentId,
        userId: { $nin: blockedUsers.map(id => new Types.ObjectId(id)) },
      };
      
      // Apply filters
      if (options.types && options.types.length > 0) {
        query.type = { $in: options.types };
      }
      
      // Add privacy filters unless viewing own activities
      const following = await this.followService.getFollowingIds(viewerId);
      
      query.$or = [
        { privacy: ActivityPrivacy.PUBLIC },
        { userId: new Types.ObjectId(viewerId) }, // User's own activities
        {
          userId: { $in: following.map(id => new Types.ObjectId(id)) },
          privacy: ActivityPrivacy.FOLLOWERS,
        },
        // Friends (mutual follows) - handled below
      ];
      
      // Get mutual follows (friends)
      const mutualFollows = await this.followService.getMutualFollowIds(viewerId);
      if (mutualFollows.length > 0) {
        query.$or.push({
          userId: { $in: mutualFollows.map(id => new Types.ObjectId(id)) },
          privacy: ActivityPrivacy.FRIENDS,
        });
      }
      
      // Get total count
      const total = await this.activityModel.countDocuments(query);
      
      // Get activities with pagination
      const activities = await this.activityModel
        .find(query)
        .populate('userId', 'username profile.avatar')
        .sort({ createdAt: -1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec();
      
      // Process activities
      const processedActivities = await this.processActivities(activities);
      
      // Determine if there are more activities
      const hasMore = (options.page * options.limit) < total;
      
      return {
        activities: processedActivities,
        total,
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Error getting content activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get activities grouped by types
   */
  async getGroupedActivities(
    userId: string,
    options: ActivityFeedDto,
  ): Promise<Record<string, Activity[]>> {
    try {
      // Get feed without grouping
      const feed = await this.getPersonalizedFeed(userId, options);
      
      // Group activities by type
      const groupedActivities: Record<string, Activity[]> = {};
      
      feed.activities.forEach(activity => {
        const type = activity.type;
        if (!groupedActivities[type]) {
          groupedActivities[type] = [];
        }
        groupedActivities[type].push(activity);
      });
      
      return groupedActivities;
    } catch (error) {
      this.logger.error(`Error getting grouped activities: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Builds MongoDB aggregation pipeline for feed generation
   */
  private buildFeedPipeline(
    userId: string,
    following: string[],
    blockedUsers: string[],
    options: ActivityFeedDto,
  ): { pipeline: any[]; countPipeline: any[] } {
    // Base match conditions
    const match: any = {};
    const userIdObj = new Types.ObjectId(userId);
    
    // Block filter - exclude activities from blocked users
    const blockFilter = blockedUsers.length > 0 ?
      { $nin: blockedUsers.map(id => new Types.ObjectId(id)) } :
      { $exists: true };
    
    match.userId = blockFilter;
    
    // Activity source filter (own, following, public, etc)
    const sourceConditions = [];
    
    // Own activities (respecting privacy settings)
    if (!options.excludeOwn) {
      sourceConditions.push({ 
        userId: userIdObj 
      });
    }
    
    // Activities from followed users (with privacy settings)
    if (following.length > 0) {
      const followingIds = following.map(id => new Types.ObjectId(id));
      
      // Followers privacy level for users I follow
      sourceConditions.push({
        userId: { $in: followingIds },
        privacy: { $in: [ActivityPrivacy.PUBLIC, ActivityPrivacy.FOLLOWERS] },
      });
      
      // Friend privacy level for mutual follows
      const mutualFollows = await this.followService.getMutualFollowIds(userId);
      if (mutualFollows.length > 0) {
        sourceConditions.push({
          userId: { $in: mutualFollows.map(id => new Types.ObjectId(id)) },
          privacy: ActivityPrivacy.FRIENDS,
        });
      }
    }
    
    // Public activities from others (if not excluded)
    if (!options.followingOnly) {
      sourceConditions.push({
        userId: { $ne: userIdObj },
        privacy: ActivityPrivacy.PUBLIC,
        // Additional relevance criteria could be added here
      });
    }
    
    match.$or = sourceConditions;
    
    // Type filter
    if (options.types && options.types.length > 0) {
      match.type = { $in: options.types };
    }
    
    // Date range filter
    if (options.fromDate || options.toDate) {
      match.createdAt = {};
      
      if (options.fromDate) {
        match.createdAt.$gte = new Date(options.fromDate);
      }
      
      if (options.toDate) {
        match.createdAt.$lte = new Date(options.toDate);
      }
    }
    
    // Build pipeline
    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: (options.page - 1) * options.limit },
      { $limit: options.limit },
      // Could add lookup stages here to populate references
    ];
    
    // Count pipeline (for total count)
    const countPipeline = [
      { $match: match },
      { $count: 'count' },
    ];
    
    return { pipeline, countPipeline };
  }

  /**
   * Process activities (populate references, group similar activities, etc)
   */
  private async processActivities(activities: Activity[]): Promise<Activity[]> {
    if (!activities.length) return [];
    
    // Group activities if requested
    const groupedActivities = new Map<string, Activity[]>();
    
    activities.forEach(activity => {
      if (activity.groupKey) {
        if (!groupedActivities.has(activity.groupKey)) {
          groupedActivities.set(activity.groupKey, []);
        }
        groupedActivities.get(activity.groupKey).push(activity);
      }
    });
    
    // Process each group
    const processedActivities: Activity[] = [];
    
    // First add non-grouped activities
    activities
      .filter(activity => !activity.groupKey)
      .forEach(activity => processedActivities.push(activity));
    
    // Then add one representative from each group
    groupedActivities.forEach((group, groupKey) => {
      // Sort group by date descending
      group.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Take most recent activity as representative
      const representative = group[0];
      
      // Add count to metadata
      representative.metadata = {
        ...representative.metadata,
        groupSize: group.length,
        groupedActivities: group.length > 1 ? group.slice(1, 5) : [], // Include a few extras
      };
      
      processedActivities.push(representative);
    });
    
    // Sort final list by date
    processedActivities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return processedActivities;
  }

  /**
   * Generate a unique key for grouping similar activities
   */
  private generateGroupKey(
    userId: string,
    type: ActivityType,
    target: ActivityTarget,
  ): string {
    // Group key format: {userId}:{type}:{targetType}:{targetId}
    return `${userId}:${type}:${target.type}:${target.id}`;
  }

  /**
   * Generate cache key for feed
   */
  private generateCacheKey(userId: string, options: ActivityFeedDto): string {
    const optionsKey = JSON.stringify({
      page: options.page,
      limit: options.limit,
      types: options.types,
      fromDate: options.fromDate,
      toDate: options.toDate,
      followingOnly: options.followingOnly,
      excludeOwn: options.excludeOwn,
    });
    
    return `${this.FEED_CACHE_PREFIX}${userId}:${optionsKey}`;
  }

  /**
   * Invalidate relevant caches when new activities are recorded
   */
  private async invalidateRelevantCaches(userId: string, activityType: ActivityType): Promise<void> {
    // Invalidate user's own feed cache
    const userCacheKey = `${this.FEED_CACHE_PREFIX}${userId}:*`;
    await this.cacheManager.del(userCacheKey);
    
    // For activities that might appear in followers' feeds, invalidate their caches too
    // This is a simplified approach - in production, you might want more targeted invalidation
    if (activityType !== ActivityPrivacy.PRIVATE) {
      // Get followers
      const followers = await this.followService.getFollowerIds(userId);
      
      // Invalidate each follower's cache
      for (const followerId of followers) {
        const followerCacheKey = `${this.FEED_CACHE_PREFIX}${followerId}:*`;
        await this.cacheManager.del(followerCacheKey);
      }
    }
  }
}
