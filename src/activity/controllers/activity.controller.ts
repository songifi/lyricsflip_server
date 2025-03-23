import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
    HttpCode,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
  } from '@nestjs/swagger';
  import { ActivityService } from '../services/activity.service';
  import { CreateActivityDto } from '../dto/create-activity.dto';
  import { QueryActivityDto } from '../dto/query-activity.dto';
  import { ActivityResponseDto } from '../dto/activity-response.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  import { ActivityType } from '../schemas/activity.schema';
  
  @ApiTags('activity')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('activity')
  export class ActivityController {
    constructor(private readonly activityService: ActivityService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new activity' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Activity created successfully',
      type: ActivityResponseDto,
    })
    @ApiBody({ type: CreateActivityDto })
    async createActivity(
      @CurrentUser() userId: string,
      @Body() createActivityDto: CreateActivityDto,
    ) {
      // Override the userId in the DTO with the authenticated user
      createActivityDto.userId = userId;
      
      const activity = await this.activityService.createActivity(createActivityDto);
      return this.mapToActivityResponse(activity);
    }
  
    @Get()
    @ApiOperation({ summary: 'Query activities with filtering' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Activities retrieved successfully',
      type: [ActivityResponseDto],
    })
    async queryActivities(@Query() queryParams: QueryActivityDto) {
      const { activities, total, page, limit } = await this.activityService.queryActivities(queryParams);
      
      return {
        activities: activities.map(activity => this.mapToActivityResponse(activity)),
        total,
        page,
        limit,
      };
    }
  
    @Get('feed')
    @ApiOperation({ summary: 'Get authenticated user\'s activity feed' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Activity feed retrieved successfully',
      type: [ActivityResponseDto],
    })
    async getUserFeed(
      @CurrentUser() userId: string,
      @Query('page') page?: number,
      @Query('limit') limit?: number,
    ) {
      // Note: This endpoint requires access to user's following list
      // In a real application, you would inject a UserService to get the followingIds
      // For this example, we'll assume it's coming from somewhere else
      
      // Mock followingIds - in a real app, get this from a user service
      const followingIds: string[] = []; // This would be populated with actual following IDs
      
      const { activities, total, page: resultPage, limit: resultLimit } = 
        await this.activityService.getUserFeed(userId, followingIds, page, limit);
      
      return {
        activities: activities.map(activity => this.mapToActivityResponse(activity)),
        total,
        page: resultPage,
        limit: resultLimit,
      };
    }
  
    @Get('me')
    @ApiOperation({ summary: 'Get authenticated user\'s recent activity' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User activities retrieved successfully',
      type: [ActivityResponseDto],
    })
    async getMyActivity(
      @CurrentUser() userId: string,
      @Query('limit') limit?: number,
    ) {
      const activities = await this.activityService.getRecentUserActivity(userId, limit);
      return activities.map(activity => this.mapToActivityResponse(activity));
    }
  
    @Get('stats/:contentId')
    @ApiOperation({ summary: 'Get activity stats for content' })
    @ApiParam({ name: 'contentId', description: 'Content ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Content stats retrieved successfully',
    })
    async getContentStats(@Param('contentId') contentId: string) {
      return this.activityService.getContentStats(contentId);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get activity by ID' })
    @ApiParam({ name: 'id', description: 'Activity ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Activity retrieved successfully',
      type: ActivityResponseDto,
    })
    @ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Activity not found',
    })
    async getActivityById(@Param('id') id: string) {
      const activity = await this.activityService.getActivityById(id);
      return this.mapToActivityResponse(activity);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an activity' })
    @ApiParam({ name: 'id', description: 'Activity ID' })
    @ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Activity deleted successfully',
    })
    async deleteActivity(
      @CurrentUser() userId: string,
      @Param('id') id: string,
    ) {
      // Get the activity first to check if the user is authorized to delete it
      const activity = await this.activityService.getActivityById(id);
      
      // Check if the user is the creator of the activity
      if (activity.userId.toString() !== userId) {
        throw new ForbiddenException('You are not authorized to delete this activity');
      }
      
      await this.activityService.deleteActivity(id);
    }
  
    /**
     * Map the DB document to a DTO with populated fields
     */
    private mapToActivityResponse(activity: any): ActivityResponseDto {
      const response: ActivityResponseDto = {
        id: activity._id.toString(),
        activityType: activity.activityType,
        metadata: activity.metadata || {},
        createdAt: activity.createdAt,
        user: {
          id: activity.userId._id ? activity.userId._id.toString() : activity.userId.toString(),
          name: activity.userId.name || 'Unknown User',
          avatar: activity.userId.avatar,
        },
        content: {
          id: activity.contentId.toString(),
          type: activity.contentType,
        },
      };
      
      // Add content-specific data from metadata if available
      if (activity.metadata) {
        if (activity.metadata.contentTitle) {
          response.content.title = activity.metadata.contentTitle;
        }
        
        if (activity.metadata.contentPreview) {
          response.content.preview = activity.metadata.contentPreview;
        }
      }
      
      return response;
    }
  }
  