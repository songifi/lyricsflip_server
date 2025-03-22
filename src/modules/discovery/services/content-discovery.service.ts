import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Content } from '../../content/schemas/content.schema';
import { User } from '../../user/schemas/user.schema';
import { Interaction } from '../../interaction/schemas/interaction.schema';
import { Connection } from '../../social/schemas/connection.schema';
import { ScoringService } from './scoring.service';
import { RecommendationCacheService } from './recommendation-cache.service';
import { ABTestingService } from './ab-testing.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ContentDiscoveryService {
  private readonly logger = new Logger(ContentDiscoveryService.name);
  private readonly trendingUpdateJob: CronJob;
  private readonly popularityUpdateJob: CronJob;
  
  // Algorithm weights - could be moved to config
  private readonly weights = {
    recency: 0.3,
    popularity: 0.5,
    relevance: 0.2,
    socialSignal: 0.4,
  };

  constructor(
    @InjectModel(Content.name) private contentModel: Model<Content>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Interaction.name) private interactionModel: Model<Interaction>,
    @InjectModel(Connection.name) private connectionModel: Model<Connection>,
    private readonly scoringService: ScoringService,
    private readonly cacheService: RecommendationCacheService,
    private readonly abTestingService: ABTestingService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    // Initialize scheduled jobs
    this.trendingUpdateJob = new CronJob(
      this.configService.get('TRENDING_UPDATE_SCHEDULE', '*/30 * * * *'), // Default: every 30 minutes
      this.updateTrendingContent.bind(this)
    );

    this.popularityUpdateJob = new CronJob(
      this.configService.get('POPULARITY_UPDATE_SCHEDULE', '0 */3 * * *'), // Default: every 3 hours
      this.updateContentPopularityScores.bind(this)
    );

    this.schedulerRegistry.addCronJob('trending-update', this.trendingUpdateJob);
    this.schedulerRegistry.addCronJob('popularity-update', this.popularityUpdateJob);

    // Start jobs
    this.trendingUpdateJob.start();
    this.popularityUpdateJob.start();
  }

  /**
   * Get personalized content recommendations for a user
   */
  async getPersonalizedRecommendations(userId: string, limit = 20): Promise<any[]> {
    // Try to get from cache first
    const cachedRecommendations = await this.cacheService.getRecommendations(
      userId, 
      'personalized', 
      limit
    );
    
    if (cachedRecommendations) {
      return cachedRecommendations;
    }

    // Get an A/B test variant for this user
    const algorithm = this.abTestingService.getRecommendationAlgorithm(userId);

    // Call the appropriate algorithm
    let recommendations;
    switch (algorithm) {
      case 'collaborative-filtering':
        recommendations = await this.collaborativeFilteringRecommendations(userId, limit);
        break;
      case 'content-based':
        recommendations = await this.contentBasedRecommendations(userId, limit);
        break;
      case 'hybrid':
      default:
        recommendations = await this.hybridRecommendations(userId, limit);
        break;
    }

    // Cache the results
    await this.cacheService.cacheRecommendations(
      userId, 
      'personalized', 
      recommendations, 
      60 * 60 * 3 // 3 hours TTL
    );

    return recommendations;
  }

  /**
   * Get trending content across the platform
   */
  async getTrendingContent(limit = 20): Promise<any[]> {
    // Try to get from cache first
    const cachedTrending = await this.cacheService.getGlobalRecommendations('trending', limit);
    
    if (cachedTrending) {
      return cachedTrending;
    }

    // Get trending content from database
    const trendingContent = await this.contentModel
      .find({ trendingScore: { $gt: 0 } })
      .sort({ trendingScore: -1 })
      .limit(limit)
      .populate('creator', 'username name avatar')
      .lean()
      .exec();

    // Cache the results
    await this.cacheService.cacheGlobalRecommendations(
      'trending', 
      trendingContent, 
      60 * 30 // 30 minutes TTL
    );

    return trendingContent;
  }

  /**
   * Get trending content within a user's network
   */
  async getNetworkTrending(userId: string, limit = 20): Promise<any[]> {
    // Try to get from cache first
    const cachedNetworkTrending = await this.cacheService.getRecommendations(
      userId, 
      'network-trending', 
      limit
    );
    
    if (cachedNetworkTrending) {
      return cachedNetworkTrending;
    }

    // Get user's connections
    const connections = await this.connectionModel
      .find({ 
        $or: [
          { fromUser: new Types.ObjectId(userId) },
          { toUser: new Types.ObjectId(userId) }
        ],
        status: 'accepted'
      })
      .select('fromUser toUser')
      .lean()
      .exec();

    // Extract connection user IDs
    const networkUserIds = connections.map(connection => 
      connection.fromUser.toString() === userId 
        ? connection.toUser 
        : connection.fromUser
    );

    if (networkUserIds.length === 0) {
      // Fall back to global trending if user has no connections
      return this.getTrendingContent(limit);
    }

    // Find content from user's network that is trending
    const networkTrending = await this.contentModel
      .find({
        creator: { $in: networkUserIds },
        trendingScore: { $gt: 0 }
      })
      .sort({ trendingScore: -1 })
      .limit(limit)
      .populate('creator', 'username name avatar')
      .lean()
      .exec();

    // If not enough content from network, supplement with global trending
    if (networkTrending.length < limit) {
      const globalTrending = await this.getTrendingContent(limit);
      
      // Filter out already included content
      const networkContentIds = networkTrending.map(content => content._id.toString());
      const additionalContent = globalTrending
        .filter(content => !networkContentIds.includes(content._id.toString()))
        .slice(0, limit - networkTrending.length);

      networkTrending.push(...additionalContent);
    }

    // Cache the results
    await this.cacheService.cacheRecommendations(
      userId, 
      'network-trending', 
      networkTrending, 
      60 * 60 // 1 hour TTL
    );

    return networkTrending;
  }

  /**
   * Get "People you may know" suggestions
   */
  async getPeopleYouMayKnow(userId: string, limit = 20): Promise<any[]> {
    // Try to get from cache first
    const cachedSuggestions = await this.cacheService.getRecommendations(
      userId, 
      'people-suggestions', 
      limit
    );
    
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    // Get user's existing connections
    const existingConnections = await this.connectionModel
      .find({ 
        $or: [
          { fromUser: new Types.ObjectId(userId) },
          { toUser: new Types.ObjectId(userId) }
        ]
      })
      .select('fromUser toUser')
      .lean()
      .exec();

    // Extract existing connection user IDs
    const connectedUserIds = existingConnections.map(connection => 
      connection.fromUser.toString() === userId 
        ? connection.toUser.toString()
        : connection.fromUser.toString()
    );

    // Add current user to exclusion list
    const excludeUserIds = [...connectedUserIds, userId];

    // Find connections of connections (2nd degree)
    const secondDegreeConnections = await this.connectionModel
      .find({
        $or: [
          { fromUser: { $in: connectedUserIds.map(id => new Types.ObjectId(id)) } },
          { toUser: { $in: connectedUserIds.map(id => new Types.ObjectId(id)) } }
        ],
        status: 'accepted'
      })
      .select('fromUser toUser')
      .lean()
      .exec();

    // Extract potential connection user IDs
    const potentialConnectionMap = new Map<string, number>();
    
    secondDegreeConnections.forEach(connection => {
      const secondDegreeUserId = 
        connectedUserIds.includes(connection.fromUser.toString())
          ? connection.toUser.toString()
          : connection.fromUser.toString();
      
      // Skip if already connected or it's the current user
      if (excludeUserIds.includes(secondDegreeUserId)) {
        return;
      }
      
      // Count occurrences to find strength of connection
      potentialConnectionMap.set(
        secondDegreeUserId, 
        (potentialConnectionMap.get(secondDegreeUserId) || 0) + 1
      );
    });

    // Convert to array and sort by connection strength
    const potentialConnectionScores = Array.from(potentialConnectionMap.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);

    // Get top potential connections
    const topConnectionIds = potentialConnectionScores
      .slice(0, limit)
      .map(conn => new Types.ObjectId(conn.userId));

    if (topConnectionIds.length === 0) {
      // Fall back to interest-based suggestions if no 2nd degree connections
      return this.getInterestBasedUserSuggestions(userId, excludeUserIds, limit);
    }

    // Fetch user details
    const userSuggestions = await this.userModel
      .find({ _id: { $in: topConnectionIds } })
      .select('username name avatar bio')
      .lean()
      .exec();

    // Sort by connection strength
    const sortedSuggestions = userSuggestions
      .map(user => ({
        ...user,
        connectionStrength: potentialConnectionScores
          .find(conn => conn.userId === user._id.toString())?.score || 0
      }))
      .sort((a, b) => b.connectionStrength - a.connectionStrength);

    // Cache the results
    await this.cacheService.cacheRecommendations(
      userId, 
      'people-suggestions', 
      sortedSuggestions, 
      60 * 60 * 24 // 24 hours TTL
    );

    return sortedSuggestions;
  }

  /**
   * Enhance search ranking with social signals
   */
  async enhanceSearchResults(userId: string, searchResults: any[], query: string): Promise<any[]> {
    if (!searchResults || searchResults.length === 0) {
      return searchResults;
    }

    // Get user's connections
    const connections = await this.connectionModel
      .find({ 
        $or: [
          { fromUser: new Types.ObjectId(userId) },
          { toUser: new Types.ObjectId(userId) }
        ],
        status: 'accepted'
      })
      .select('fromUser toUser')
      .lean()
      .exec();

    // Extract connection user IDs
    const networkUserIds = connections.map(connection => 
      connection.fromUser.toString() === userId 
        ? connection.toUser.toString()
        : connection.fromUser.toString()
    );

    // Score and re-rank search results
    const scoredResults = searchResults.map(result => {
      // Base score from search relevance (already normalized)
      let score = result._score || 0.5; // Default if no score provided
      
      // Boost content from user's network
      if (result.creator && networkUserIds.includes(result.creator.toString())) {
        score *= 1.5; // 50% boost for content from connections
      }
      
      // Boost content with high popularity
      if (result.popularityScore) {
        score += (result.popularityScore * this.weights.popularity);
      }
      
      // Boost content with interactions from connections
      if (result.interactionCount && result.interactionCount > 0) {
        const networkInteractions = result.networkInteractions || 0;
        if (networkInteractions > 0) {
          score += (networkInteractions / result.interactionCount) * this.weights.socialSignal;
        }
      }
      
      return {
        ...result,
        _enhancedScore: score
      };
    });

    // Sort by enhanced score
    return scoredResults.sort((a, b) => b._enhancedScore - a._enhancedScore);
  }

  /**
   * Update trending content scores (scheduled job)
   */
  private async updateTrendingContent(): Promise<void> {
    this.logger.log('Updating trending content scores');
    
    try {
      // Get all content with recent interactions
      const recentTimeframe = new Date();
      recentTimeframe.setHours(recentTimeframe.getHours() - 24); // Last 24 hours
      
      // Get recent interactions
      const recentInteractions = await this.interactionModel
        .find({ createdAt: { $gte: recentTimeframe } })
        .lean()
        .exec();
      
      if (recentInteractions.length === 0) {
        this.logger.debug('No recent interactions found for trending calculation');
        return;
      }
      
      // Group interactions by content
      const interactionsByContent = recentInteractions.reduce((acc, interaction) => {
        const contentId = interaction.contentId.toString();
        if (!acc[contentId]) {
          acc[contentId] = [];
        }
        acc[contentId].push(interaction);
        return acc;
      }, {});
      
      // Calculate trending scores for each content
      const contentUpdates = await Promise.all(
        Object.entries(interactionsByContent).map(async ([contentId, interactions]) => {
          // Get time-weighted interaction count
          const trendingScore = this.calculateTrendingScore(interactions);
          
          // Update content with trending score
          return this.contentModel.updateOne(
            { _id: new Types.ObjectId(contentId) },
            { $set: { trendingScore } }
          );
        })
      );
      
      this.logger.log(`Updated trending scores for ${contentUpdates.length} content items`);
      
      // Invalidate cache for trending content
      await this.cacheService.invalidateGlobalRecommendations('trending');
      
    } catch (error) {
      this.logger.error('Error updating trending content', error);
    }
  }

  /**
   * Update content popularity scores (scheduled job)
   */
  private async updateContentPopularityScores(): Promise<void> {
    this.logger.log('Updating content popularity scores');
    
    try {
      // Get all content
      const allContent = await this.contentModel
        .find({})
        .lean()
        .exec();
      
      if (allContent.length === 0) {
        this.logger.debug('No content found for popularity calculation');
        return;
      }
      
      // Calculate popularity for each content
      const contentUpdates = await Promise.all(
        allContent.map(async (content) => {
          // Get interactions for this content
          const interactions = await this.interactionModel
            .find({ contentId: content._id })
            .lean()
            .exec();
          
          // Calculate popularity score
          const popularityScore = this.scoringService.calculatePopularityScore(
            content, 
            interactions,
            { ignoreAge: false }
          );
          
          // Update content with popularity score
          return this.contentModel.updateOne(
            { _id: content._id },
            { $set: { popularityScore } }
          );
        })
      );
      
      this.logger.log(`Updated popularity scores for ${contentUpdates.length} content items`);
      
    } catch (error) {
      this.logger.error('Error updating content popularity scores', error);
    }
  }

  /**
   * Calculate trending score for content based on recent interactions
   */
  private calculateTrendingScore(interactions: any[]): number {
    if (!interactions || interactions.length === 0) {
      return 0;
    }
    
    const now = new Date();
    let score = 0;
    
    interactions.forEach(interaction => {
      // Calculate recency weight (more recent = higher weight)
      const interactionTime = new Date(interaction.createdAt);
      const hoursAgo = (now.getTime() - interactionTime.getTime()) / (1000 * 60 * 60);
      const recencyWeight = Math.max(0, 1 - (hoursAgo / 24)); // 0-1 scale, 0 if older than 24h
      
      // Calculate interaction weight based on type
      let interactionWeight;
      switch (interaction.type) {
        case 'like':
          interactionWeight = 1;
          break;
        case 'comment':
          interactionWeight = 2;
          break;
        case 'share':
          interactionWeight = 3;
          break;
        case 'save':
          interactionWeight = 2.5;
          break;
        default:
          interactionWeight = 0.5;
      }
      
      // Add to score
      score += interactionWeight * recencyWeight;
    });
    
    return score;
  }

  /**
   * Get content recommendations using collaborative filtering
   */
  private async collaborativeFilteringRecommendations(userId: string, limit: number): Promise<any[]> {
    try {
      // Get user's interactions
      const userInteractions = await this.interactionModel
        .find({ userId: new Types.ObjectId(userId) })
        .lean()
        .exec();
      
      if (userInteractions.length === 0) {
        // Fall back to popular content if user has no interactions
        return this.getPopularContent(limit);
      }
      
      // Extract content IDs the user has interacted with
      const interactedContentIds = userInteractions.map(
        interaction => interaction.contentId.toString()
      );
      
      // Find similar users by interaction patterns
      const similarUserInteractions = await this.interactionModel
        .find({ 
          contentId: { $in: interactedContentIds.map(id => new Types.ObjectId(id)) },
          userId: { $ne: new Types.ObjectId(userId) }
        })
        .lean()
        .exec();
      
      // Count interactions by user
      const userInteractionCounts = {};
      similarUserInteractions.forEach(interaction => {
        const otherUserId = interaction.userId.toString();
        if (!userInteractionCounts[otherUserId]) {
          userInteractionCounts[otherUserId] = 0;
        }
        userInteractionCounts[otherUserId]++;
      });
      
      // Get top similar users
      const similarUserIds = Object.entries(userInteractionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(entry => new Types.ObjectId(entry[0]));
      
      if (similarUserIds.length === 0) {
        // Fall back to popular content if no similar users found
        return this.getPopularContent(limit);
      }
      
      // Get content that similar users interacted with
      const recommendedContentInteractions = await this.interactionModel
        .find({
          userId: { $in: similarUserIds },
          contentId: { $nin: interactedContentIds.map(id => new Types.ObjectId(id)) }
        })
        .sort({ createdAt: -1 })
        .limit(limit * 3) // Get more than needed for post-processing
        .populate({
          path: 'contentId',
          populate: {
            path: 'creator',
            select: 'username name avatar'
          }
        })
        .lean()
        .exec();
      
      // Extract and deduplicate content
      const contentMap = new Map();
      recommendedContentInteractions.forEach(interaction => {
        if (interaction.contentId && !contentMap.has(interaction.contentId._id.toString())) {
          contentMap.set(
            interaction.contentId._id.toString(),
            interaction.contentId
          );
        }
      });
      
      // Convert to array and take top items
      let recommendations = Array.from(contentMap.values()).slice(0, limit);
      
      // If not enough recommendations, supplement with popular content
      if (recommendations.length < limit) {
        const popularContent = await this.getPopularContent(limit - recommendations.length);
        
        // Filter out already recommended content
        const recommendedIds = recommendations.map(content => content._id.toString());
        const additionalContent = popularContent.filter(
          content => !recommendedIds.includes(content._id.toString())
        );
        
        recommendations = [...recommendations, ...additionalContent];
      }
      
      return recommendations;
      
    } catch (error) {
      this.logger.error('Error getting collaborative filtering recommendations', error);
      // Fall back to popular content on error
      return this.getPopularContent(limit);
    }
  }

  /**
   * Get content recommendations using content-based filtering
   */
  private async contentBasedRecommendations(userId: string, limit: number): Promise<any[]> {
    try {
      // Get user's interactions
      const userInteractions = await this.interactionModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('contentId')
        .lean()
        .exec();
      
      if (userInteractions.length === 0) {
        // Fall back to popular content if user has no interactions
        return this.getPopularContent(limit);
      }
      
      // Extract content the user has interacted with
      const interactedContent = userInteractions
        .filter(interaction => interaction.contentId)
        .map(interaction => interaction.contentId);
      
      if (interactedContent.length === 0) {
        return this.getPopularContent(limit);
      }
      
      // Extract features from content (tags, categories, etc.)
      const contentFeatures = this.extractContentFeatures(interactedContent);
      
      if (Object.keys(contentFeatures).length === 0) {
        return this.getPopularContent(limit);
      }
      
      // Get already interacted content IDs to exclude
      const interactedContentIds = interactedContent.map(
        content => content._id.toString()
      );
      
      // Find content with similar features
      const recommendations = await this.contentModel
        .find({
          _id: { $nin: interactedContentIds.map(id => new Types.ObjectId(id)) },
          $or: this.buildFeatureQuery(contentFeatures)
        })
        .limit(limit * 2) // Get more than needed for scoring
        .populate('creator', 'username name avatar')
        .lean()
        .exec();
      
      // Score and sort recommendations by feature similarity
      const scoredRecommendations = recommendations.map(content => {
        const similarityScore = this.calculateFeatureSimilarity(
          content, 
          contentFeatures
        );
        
        return {
          ...content,
          _similarityScore: similarityScore
        };
      });
      
      // Sort by similarity score and take top items
      return scoredRecommendations
        .sort((a, b) => b._similarityScore - a._similarityScore)
        .slice(0, limit);
      
    } catch (error) {
      this.logger.error('Error getting content-based recommendations', error);
      // Fall back to popular content on error
      return this.getPopularContent(limit);
    }
  }

  /**
   * Get content recommendations using hybrid approach
   */
  private async hybridRecommendations(userId: string, limit: number): Promise<any[]> {
    try {
      // Get recommendations from both approaches
      const [collaborativeRecs, contentBasedRecs] = await Promise.all([
        this.collaborativeFilteringRecommendations(userId, limit),
        this.contentBasedRecommendations(userId, limit)
      ]);
      
      // Combine and deduplicate recommendations
      const uniqueRecommendations = new Map();
      
      // Add collaborative filtering results with weight
      collaborativeRecs.forEach((rec, index) => {
        const position = index / collaborativeRecs.length;
        const score = 1 - (position * 0.7); // Score from 1.0 to 0.3 based on position
        
        uniqueRecommendations.set(rec._id.toString(), {
          content: rec,
          score: score,
          source: 'collaborative'
        });
      });
      
      // Add content-based results with weight
      contentBasedRecs.forEach((rec, index) => {
        const recId = rec._id.toString();
        const position = index / contentBasedRecs.length;
        const score = 0.9 - (position * 0.6); // Score from 0.9 to 0.3 based on position
        
        if (uniqueRecommendations.has(recId)) {
          // If already added from collaborative, boost score
          const existing = uniqueRecommendations.get(recId);
          existing.score += score;
          existing.source = 'both';
        } else {
          uniqueRecommendations.set(recId, {
            content: rec,
            score: score,
            source: 'content-based'
          });
        }
      });
      
      // Convert to array, sort by score, and extract content
      const sortedRecommendations = Array.from(uniqueRecommendations.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.content);
      
      // If not enough recommendations, supplement with popular content
      if (sortedRecommendations.length < limit) {
        const popularContent = await this.getPopularContent(limit - sortedRecommendations.length);
        
        // Filter out already recommended content
        const recommendedIds = sortedRecommendations.map(content => content._id.toString());
        const additionalContent = popularContent.filter(
          content => !recommendedIds.includes(content._id.toString())
        );
        
        return [...sortedRecommendations, ...additionalContent];
      }
      
      return sortedRecommendations;
      
    } catch (error) {
      this.logger.error('Error getting hybrid recommendations', error);
      // Fall back to popular content on error
      return this.getPopularContent(limit);
    }
  }

  /**
   * Get popular content for fallback recommendations
   */
  private async getPopularContent(limit: number): Promise<any[]> {
    return this.contentModel
      .find({})
      .sort({ popularityScore: -1 })
      .limit(limit)
      .populate('creator', 'username name avatar')
      .lean()
      .exec();
  }

  /**
   * Get interest-based user suggestions
   */
  private async getInterestBasedUserSuggestions(
    userId: string, 
    excludeUserIds: string[], 
    limit: number
  ): Promise<any[]> {
    // Get user interests
    const user = await this.userModel.findById(userId).select('interests').lean().exec();
    
    if (!user || !user.interests || user.interests.length === 0) {
      // If no interests, return random users
      return this.getRandomUserSuggestions(excludeUserIds, limit);
    }
    
    // Find users with similar interests
    const similarUsers = await this.userModel
      .find({
        _id: { $nin: excludeUserIds.map(id => new Types.ObjectId(id)) },
        interests: { $in: user.interests }
      })
      .select('username name avatar bio interests')
      .limit(limit * 2) // Get more for scoring
      .lean()
      .exec();
    
    if (similarUsers.length === 0) {
      return this.getRandomUserSuggestions(excludeUserIds, limit);
    }
    
    // Score by interest overlap
    const scoredUsers = similarUsers.map(otherUser => {
      const otherInterests = otherUser.interests || [];
      const overlapCount = user.interests.filter(interest => 
        otherInterests.includes(interest)
      ).length;
      
      const overlapScore = overlapCount / user.interests.length;
      
      return {
        ...otherUser,
        interestOverlap: overlapScore
      };
    });
    
    // Sort by overlap score and take top results
    return scoredUsers
      .sort((a, b) => b.interestOverlap - a.interestOverlap)
      .slice(0, limit);
  }

  /**
   * Get random user suggestions as fallback
   */
  private async getRandomUserSuggestions(excludeUserIds: string[], limit: number): Promise<any[]> {
    // Find random users
    return this.userModel
      .find({ _id: { $nin: excludeUserIds.map(id => new Types.ObjectId(id)) } })
      .select('username name avatar bio')
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Extract features from content for content-based filtering
   */
  private extractContentFeatures(contentItems: any[]): Record<string, number> {
    const features = {};
    
    contentItems.forEach(content => {
      // Process tags
      if (content.tags && Array.isArray(content.tags)) {
        content.tags.forEach(tag => {
          if (!features[`tag:${tag}`]) {
            features[`tag:${tag}`] = 0;
          }
          features[`tag:${tag}`] += 1;
        });
      }
      
      // Process categories
      if (content.category) {
        const category = `category:${content.category}`;
        if (!features[category]) {
          features[category] = 0;
        }
        features[category] += 1;
      }
      
      // Process creator
      if (content.creator) {
        const creator = `creator:${content.creator.toString()}`;
        if (!features[creator]) {
          features[creator] = 0;
        }
        features[creator] += 1;
      }
      
      // Process content type
      if (content.contentType) {
        const contentType = `type:${content.contentType}`;
        if (!features[contentType]) {
          features[contentType] = 0;
        }
        features[contentType] += 1;
      }
    });
    
    return features;
  }

  /**
   * Build MongoDB query for content-based recommendations
   */
  private buildFeatureQuery(features: Record<string, number>): any[] {
    const queryConditions = [];
    
    // Get top features (most frequent)
    const topFeatures = Object.entries(features)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    topFeatures.forEach(([feature, count]) => {
      if (feature.startsWith('tag:')) {
        const tag = feature.substring(4);
        queryConditions.push({ tags: tag });
      }
      else if (feature.startsWith('category:')) {
        const category = feature.substring(9);
        queryConditions.push({ category });
      }
      else if (feature.startsWith('creator:')) {
        const creator = feature.substring(8);
        queryConditions.push({ creator: new Types.ObjectId(creator) });
      }
      else if (feature.startsWith('type:')) {
        const type = feature.substring(5);
        queryConditions.push({ contentType: type });
      }
    });
    
    return queryConditions;
  }

  /**
   * Calculate feature similarity between content and user preferences
   */
  private calculateFeatureSimilarity(
    content: any, 
    userFeatures: Record<string, number>
  ): number {
    let similarityScore = 0;
    let totalUserFeatureWeight = 0;
    
    // Get total weight of user features for normalization
    Object.values(userFeatures).forEach(weight => {
      totalUserFeatureWeight += weight;
    });
    
    // Check for tag matches
    if (content.tags && Array.isArray(content.tags)) {
      content.tags.forEach(tag => {
        const featureKey = `tag:${tag}`;
        if (userFeatures[featureKey]) {
          similarityScore += userFeatures[featureKey];
        }
      });
    }
    
    // Check for category match
    if (content.category) {
      const featureKey = `category:${content.category}`;
      if (userFeatures[featureKey]) {
        similarityScore += userFeatures[featureKey];
      }
    }
    
    // Check for creator match
    if (content.creator) {
      const featureKey = `creator:${content.creator._id || content.creator}`;
      if (userFeatures[featureKey]) {
        similarityScore += userFeatures[featureKey] * 2; // Creator match is weighted more
      }
    }
    
    // Check for content type match
    if (content.contentType) {
      const featureKey = `type:${content.contentType}`;
      if (userFeatures[featureKey]) {
        similarityScore += userFeatures[featureKey];
      }
    }
    
    // Normalize score
    return totalUserFeatureWeight > 0 
      ? similarityScore / totalUserFeatureWeight
      : 0;
  }
}

