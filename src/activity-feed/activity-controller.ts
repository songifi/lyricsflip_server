// src/modules/activity/activity.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import { RecordActivityDto } from './dto/record-activity.dto';
import { ActivityFeedDto } from './dto/activity-feed.dto';
import { ActivityType } from './schemas/activity.schema';
import { ActivityResponseDto, ActivityFeedResponseDto } from './dto/activity-response.dto';

@ApiTags('activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new activity' })
  @ApiBody({ type: RecordActivityDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Activity recorded successfully',
    type: ActivityResponseDto,
  })
  async recordActivity(
    @CurrentUser('sub') userId: string,
    @Body() recordActivityDto: RecordActivityDto,
  ) {
    // Override userId with authenticated user's ID for security
    recordActivityDto.userId = userId;
    
    const activity = await this.activityService.recordActivity(recordActivityDto);
    
    return this.mapActivityToResponse(activity);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get personalized activity feed' })
  @ApiQuery({ type: ActivityFeedDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity feed retrieved successfully',
    type: ActivityFeedResponseDto,
  })
  async getPersonalizedFeed(
    @CurrentUser('sub') userId: string,
    @Query() options: ActivityFeedDto,
  ) {
    const feed = await this.activityService.getPersonalizedFeed(userId, options);
    
    return {
      activities: feed.activities.map(activity => this.mapActivityToResponse(activity)),
      total: feed.total,
      hasMore: feed.hasMore,
    };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get activities for a specific user' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ type: ActivityFeedDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User activities retrieved successfully',
    type: ActivityFeedResponseDto,
  })
  async getUserActivities(
    @CurrentUser('sub') viewerId: string,
    @Param('userId') userId: string,
    @Query() options: ActivityFeedDto,
  ) {
    const feed = await this.activityService.getUserActivities(viewerId, userId, options);
    
    return {
      activities: feed.activities.map(activity => this.mapActivityToResponse(activity)),
      total: feed.total,
      hasMore: feed.hasMore,
    };
  }

  @Get('content/:contentType/:contentId')
  @ApiOperation({ summary: 'Get activities related to specific content' })
  @ApiParam({ name: 'contentType', description: 'Type of content (e.g., song, playlist)' })
  @ApiParam({ name: 'contentId', description: 'ID of the content' })
  @ApiQuery({ type: ActivityFeedDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content activities retrieved successfully',
    type: ActivityFeedResponseDto,
  })
  async getContentActivities(
    @CurrentUser('sub') userId: string,
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
    @Query() options: ActivityFeedDto,
  ) {
    const feed = await this.activityService.getContentActivities(
      userId, 
      contentType, 
      contentId, 
      options
    );
    
    return {
      activities: feed.activities.map(activity => this.mapActivityToResponse(activity)),
      total: feed.total,
      hasMore: feed.hasMore,
    };
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Get activities grouped by type' })
  @ApiQuery({ type: ActivityFeedDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Grouped activities retrieved successfully',
  })
  async getGroupedActivities(
    @CurrentUser('sub') userId: string,
    @Query() options: ActivityFeedDto,
  ) {
    const groupedActivities = await this.activityService.getGroupedActivities(userId, options);
    
    // Transform each group
    const result: Record<string, ActivityResponseDto[]> = {};
    
    Object.entries(groupedActivities).forEach(([type, activities]) => {
      result[type] = activities.map(activity => this.mapActivityToResponse(activity));
    });
    
    return result;
  }

  /**
   * Map Activity entity to ActivityResponseDto
   */
  private mapActivityToResponse(activity: any): ActivityResponseDto {
    return {
      id: activity._id.toString(),
      user: {
        id: activity.userId._id ? activity.userId._id.toString() : activity.userId.toString(),
        username: activity.userId.username,
        avatar: activity.userId.profile?.avatar,
      },
      type: activity.type,
      target: activity.target,
      metadata: activity.metadata,
      privacy: activity.privacy,
      createdAt: activity.createdAt,
      groupKey: activity.groupKey,
    };
  }
}
