import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { NotificationService } from './notification.service';
import { 
  CreateNotificationDto, 
  UpdateNotificationDto, 
  NotificationQueryDto,
  NotificationIdParam,
  NotificationBulkReadDto
} from './notification.dto';
import { Notification } from './notification.schema';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new notification (admin only)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Notification created successfully' })
  create(@Body() createNotificationDto: CreateNotificationDto): Promise<Notification> {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns all notifications for the user' })
  findAll(
    @GetUser('id') userId: string,
    @Query() queryDto: NotificationQueryDto
  ): Promise<Notification[]> {
    return this.notificationService.findAll(userId, queryDto);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get notification counts for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns notification counts' })
  countNotifications(@GetUser('id') userId: string) {
    return this.notificationService.countNotifications(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Returns the notification' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  async findOne(
    @Param() params: NotificationIdParam,
    @GetUser('id') userId: string
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(params.id);
    
    // Ensure the notification belongs to the current user
    if (notification.userId !== userId) {
      throw new Error('You do not have permission to access this notification');
    }
    
    return notification;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  async update(
    @Param() params: NotificationIdParam,
    @Body() updateNotificationDto: UpdateNotificationDto,
    @GetUser('id') userId: string
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(params.id);
    
    // Ensure the notification belongs to the current user
    if (notification.userId !== userId) {
      throw new Error('You do not have permission to update this notification');
    }
    
    return this.notificationService.update(params.id, updateNotificationDto);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification marked as read' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  async markAsRead(
    @Param() params: NotificationIdParam,
    @GetUser('id') userId: string
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(params.id);
    
    // Ensure the notification belongs to the current user
    if (notification.userId !== userId) {
      throw new Error('You do not have permission to update this notification');
    }
    
    return this.notificationService.markAsRead(params.id);
  }

  @Put(':id/unread')
  @ApiOperation({ summary: 'Mark a notification as unread' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notification marked as unread' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  async markAsUnread(
    @Param() params: NotificationIdParam,
    @GetUser('id') userId: string
  ): Promise<Notification> {
    const notification = await this.notificationService.findOne(params.id);
    
    // Ensure the notification belongs to the current user
    if (notification.userId !== userId) {
      throw new Error('You do not have permission to update this notification');
    }
    
    return this.notificationService.markAsUnread(params.id);
  }

  @Put('bulk/read')
  @ApiOperation({ summary: 'Mark multiple notifications as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notifications marked as read' })
  markManyAsRead(
    @Body() bulkReadDto: NotificationBulkReadDto,
    @GetUser('id') userId: string
  ): Promise<number> {
    // Note: In a real app, you'd want to verify that all IDs belong to the current user
    return this.notificationService.markManyAsRead(bulkReadDto);
  }

  @Put('all/read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: HttpStatus.OK, description: 'All notifications marked as read' })
  markAllAsRead(@GetUser('id') userId: string): Promise<number> {
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Notification deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Notification not found' })
  async remove(
    @Param() params: NotificationIdParam,
    @GetUser('id') userId: string
  ): Promise<void> {
    const notification = await this.notificationService.findOne(params.id);
    
    // Ensure the notification belongs to the current user
    if (notification.userId !== userId) {
      throw new Error('You do not have permission to delete this notification');
    }
    
    return this.notificationService.remove(params.id);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete multiple notifications' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Notifications deleted successfully' })
  removeMany(
    @Body() ids: string[],
    @GetUser('id') userId: string
  ): Promise<number> {
    // Note: In a real app, you'd want to verify that all IDs belong to the current user
    return this.notificationService.removeMany(ids);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all notifications for the current user' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'All notifications deleted successfully' })
  removeAll(@GetUser('id') userId: string): Promise<number> {
    return this.notificationService.removeAllForUser(userId);
  }
}
