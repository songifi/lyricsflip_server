import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument, ActivityType, ContentType } from '../schemas/activity.schema';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { QueryActivityDto } from '../dto/query-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  /**
   * Create a new activity record
   */
  async createActivity(createActivityDto: CreateActivityDto): Promise<ActivityDocument> {
    const { userId, contentId, ...rest } = createActivityDto;
    
    // Check if this is a duplicate activity (e.g., liking the same post twice)
    if (createActivityDto.activityType === ActivityType.LIKE || 
        createActivityDto.activityType === ActivityType.FOLLOW) {
      const existingActivity = await this.activityModel.findOne({
        userId: new Types.ObjectId(userId),
        contentId: new Types.ObjectId(contentId),
        activityType: createActivityDto.activityType,
      });

      if (existingActivity) {
        throw new BadRequestException(`User has already performed this ${createActivityDto.activityType} activity`);
      }
    }

    // Create the new activity
    const newActivity = new this.activityModel({
      userId: new Types.ObjectId(userId),
      contentId: new Types.ObjectId(contentId),
      ...rest,
    });

    return newActivity.save();
  }

  /**
   * Delete an activity record
   */
  async deleteActivity(id: string): Promise<void> {
    const result = await this.activityModel.deleteOne({ _id: new Types.ObjectId(id) });
    
    if (result.deletedCount === 0) {
      throw new NotFoundException('Activity not found');
    }
  }

  /**
   * Get activity by ID
   */
  async getActivityById(id: string): Promise<ActivityDocument> {
    const activity = await this.activityModel.findById(id);
    
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    
    return activity;
  }

  /**
   * Query activities with filtering, pagination and optional population
   */
  async queryActivities(
    queryParams: QueryActivityDto,
    populateUser = true,
  ): Promise<{ activities: ActivityDocument[], total: number, page: number, limit: number }> {
    const { 
      userId, activityTypes, contentType, contentId, 
      startDate, endDate, page = 1, limit = 20 
    } = queryParams;
    
    const query: any = {};
    
    // Apply filters
    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }
    
    if (activityTypes && activityTypes.length > 0) {
      query.activityType = { $in: activityTypes };
    }
    
    if (contentType) {
      query.contentType = contentType;
    }
    
    if (contentId) {
      query.contentId = new Types.ObjectId(contentId);
    }
    
    // Apply date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        query.createdAt.$gte = startDate;
      }
      
      if (endDate) {
        query.createdAt.$lte = endDate;
      }
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get total count
    const total = await this.activityModel.countDocuments(query);
    
    // Build query with pagination
    let activitiesQuery = this.activityModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Populate user information if requested
    if (populateUser) {
      activitiesQuery = activitiesQuery.populate('userId', 'name avatar');
    }
    
    const activities = await activitiesQuery.exec();
    
    return {
      activities,
      total,
      page,
      limit,
    };
  }

  /**
   * Get user activity feed (activities from users they follow)
   */
  async getUserFeed(
    userId: string,
    followingIds: string[],
    page = 1,
    limit = 20,
  ): Promise<{ activities: ActivityDocument[], total: number, page: number, limit: number }> {
    // Convert string IDs to ObjectIds
    const followingObjectIds = followingIds.map(id => new Types.ObjectId(id));
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build query for activities from followed users
    const query = {
      userId: { $in: followingObjectIds },
    };
    
    // Get total count
    const total = await this.activityModel.countDocuments(query);
    
    // Get activities with pagination
    const activities = await this.activityModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatar')
      .exec();
    
    return {
      activities,
      total,
      page,
      limit,
    };
  }
  
  /**
   * Get activity stats for content (e.g., count likes, comments)
   */
  async getContentStats(contentId: string): Promise<Record<string, number>> {
    const objectId = new Types.ObjectId(contentId);
    
    const aggregation = await this.activityModel
      .aggregate([
        { $match: { contentId: objectId } },
        { $group: { _id: '$activityType', count: { $sum: 1 } } },
      ])
      .exec();
    
    // Convert to object mapping activityType -> count
    const stats: Record<string, number> = {};
    aggregation.forEach(item => {
      stats[item._id] = item.count;
    });
    
    // Ensure all activity types have a value, defaulting to 0
    Object.values(ActivityType).forEach(type => {
      if (!stats[type]) {
        stats[type] = 0;
      }
    });
    
    return stats;
  }
  
  /**
   * Get recent activity for a user
   */
  async getRecentUserActivity(
    userId: string,
    limit = 10,
  ): Promise<ActivityDocument[]> {
    return this.activityModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
