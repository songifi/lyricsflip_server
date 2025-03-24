import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { NotificationRepository } from './notification.repository';
import { 
  Notification, 
  NotificationType, 
  NotificationChannel,
  NotificationStatus 
} from './notification.entity';
import { 
  CreateNotificationDto,
  CreateNotificationFromTemplateDto,
  UpdateNotificationDto,
  NotificationQueryDto,
  MarkReadDto,
  NotificationCountsDto 
} from './notification.dto';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationPreferenceService } from './notification-preference.service';
import { UserService } from '../user/user.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  
  // Cache TTL in seconds
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
    private readonly connection: Connection,
    private readonly eventEmitter: EventEmitter2,
    private readonly templateService: NotificationTemplateService,
    private readonly preferenceService: NotificationPreferenceService,
    private readonly userService: UserService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Create a new notification
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    try {
      // Check if notification type is enabled for this user and channel
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        dto.userId,
        dto.type,
        dto.channel
      );
      
      if (!isEnabled) {
        this.logger.log(
          `Notification type ${dto.type} is disabled for user ${dto.userId} on channel ${dto.channel}`
        );
        return null;
      }
      
      // Create notification
      const notification = this.notificationRepository.create({
        ...dto,
        status: NotificationStatus.PENDING
      });
      
      const savedNotification = await this.notificationRepository.save(notification);
      
      // Invalidate unread count cache
      await this.cacheService.del(`notification:unread:${dto.userId}`);
      
      // Emit event
      this.eventEmitter.emit('notification.created', savedNotification);
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Create a notification using a template
   */
  async createFromTemplate(
    dto: CreateNotificationFromTemplateDto
  ): Promise<Notification> {
    try {
      // Check if notification type is enabled for this user and channel
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        dto.userId,
        dto.type,
        dto.channel
      );
      
      if (!isEnabled) {
        this.logger.log(
          `Notification type ${dto.type} is disabled for user ${dto.userId} on channel ${dto.channel}`
        );
        return null;
      }
      
      // Prepare variables for template
      const variables = await this.prepareTemplateVariables(dto);
      
      // Render template
      const rendered = await this.templateService.renderNotification(
        dto.type,
        variables,
        dto.channel
      );
      
      // Create notification
      const notification = this.notificationRepository.create({
        userId: dto.userId,
        type: dto.type,
        actorId: dto.actorId,
        title: rendered.title,
        body: rendered.body,
        data: rendered.data || dto.data,
        metadata: dto.metadata,
        channel: dto.channel,
        status: NotificationStatus.PENDING
      });
      
      const savedNotification = await this.notificationRepository.save(notification);
      
      // Invalidate unread count cache
      await this.cacheService.del(`notification:unread:${dto.userId}`);
      
      // Emit event
      this.eventEmitter.emit('notification.created', savedNotification);
      
      return savedNotification;
    } catch (error) {
      this.logger.error(`Error creating notification from template: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get notifications for a user with filtering
   */
  async getNotifications(
    userId: string,
    queryDto: NotificationQueryDto
  ): Promise<[Notification[], number]> {
    try {
      return this.notificationRepository.findNotifications(userId, queryDto);
    } catch (error) {
      this.logger.error(`Error getting notifications: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get a single notification by ID
   */
  async getNotificationById(id: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne(id, {
        relations: ['actor']
      });
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      return notification;
    } catch (error) {
      this.logger.error(`Error getting notification: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Mark a notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id, userId }
      });
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      // Skip if already read
      if (notification.read) {
        return notification;
      }
      
      // Update notification
      notification.read = true;
      notification.readAt = new Date();
      
      const updatedNotification = await this.notificationRepository.save(notification);
      
      // Invalidate unread count cache
      await this.cacheService.del(`notification:unread:${userId}`);
      
      // Emit event
      this.eventEmitter.emit('notification.read', updatedNotification);
      
      return updatedNotification;
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(dto: MarkReadDto, userId: string): Promise<number> {
    try {
      // Check that all notifications belong to the user
      const notifications = await this.notificationRepository.find({
        where: { id: In(dto.ids) }
      });
      
      const userNotificationIds = notifications
        .filter(n => n.userId === userId)
        .map(n => n.id);
      
      if (userNotificationIds.length === 0) {
        return 0;
      }
      
      // Mark as read
      const updated = await this.notificationRepository.markAsRead(userNotificationIds);
      
      // Invalidate unread count cache
      if (updated > 0) {
        await this.cacheService.del(`notification:unread:${userId}`);
        
        // Emit event
        this.eventEmitter.emit('notifications.bulk.read', {
          userId,
          notificationIds: userNotificationIds
        });
      }
      
      return updated;
    } catch (error) {
      this.logger.error(`Error marking multiple notifications as read: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const updated = await this.notificationRepository.markAllAsRead(userId);
      
      // Invalidate unread count cache
      if (updated > 0) {
        await this.cacheService.del(`notification:unread:${userId}`);
        
        // Emit event
        this.eventEmitter.emit('notifications.all.read', { userId });
      }
      
      return updated;
    } catch (error) {
      this.logger.error(`Error marking all notifications as read: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Get notification counts for a user
   */
  async getNotificationCounts(userId: string): Promise<NotificationCountsDto> {
    try {
      // Check cache for unread count
      const cacheKey = `notification:unread:${userId}`;
      const cachedUnread = await this.cacheService.get(cacheKey);
      
      let unread: number;
      if (cachedUnread !== null) {
        unread = parseInt(cachedUnread);
      } else {
        unread = await this.notificationRepository.countUnread(userId);
        // Cache for a limited time
        await this.cacheService.set(cacheKey, unread.toString(), this.CACHE_TTL);
      }
      
      // Get total count (not cached for accuracy)
      const total = await this.notificationRepository.count({ userId });
      
      return { total, unread };
    } catch (error) {
      this.logger.error(`Error getting notification counts: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Delete a notification
   */
  async deleteNotification(id: string, userId: string): Promise<boolean> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id, userId }
      });
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      await this.notificationRepository.remove(notification);
      
      // Invalidate unread count cache if it was unread
      if (!notification.read) {
        await this.cacheService.del(`notification:unread:${userId}`);
      }
      
      // Emit event
      this.eventEmitter.emit('notification.deleted', {
        id,
        userId,
        type: notification.type
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string): Promise<number> {
    try {
      const result = await this.notificationRepository.delete({ userId });
      
      // Invalidate unread count cache
      await this.cacheService.del(`notification:unread:${userId}`);
      
      // Emit event
      this.eventEmitter.emit('notifications.all.deleted', { userId });
      
      return result.affected || 0;
    } catch (error) {
      this.logger.error(`Error deleting all notifications: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Update a notification
   */
  async updateNotification(
    id: string,
    userId: string,
    dto: UpdateNotificationDto
  ): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id, userId }
      });
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      // Update fields
      if (dto.read !== undefined && notification.read !== dto.read) {
        notification.read = dto.read;
        
        if (dto.read) {
          notification.readAt = new Date();
        } else {
          notification.readAt = null;
        }
        
        // Invalidate unread count cache
        await this.cacheService.del(`notification:unread:${userId}`);
      }
      
      if (dto.status !== undefined) {
        notification.status = dto.status;
      }
      
      if (dto.data !== undefined) {
        notification.data = dto.data;
      }
      
      if (dto.metadata !== undefined) {
        notification.metadata = dto.metadata;
      }
      
      const updatedNotification = await this.notificationRepository.save(notification);
      
      // Emit event
      this.eventEmitter.emit('notification.updated', updatedNotification);
      
      return updatedNotification;
    } catch (error) {
      this.logger.error(`Error updating notification: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  /**
   * Prepare variables for a notification template
   */
  private async prepareTemplateVariables(
    dto: CreateNotificationFromTemplateDto
  ): Promise<Record<string, any>> {
    // Start with the provided variables
    const variables = { ...dto.variables } || {};
    
    // Add actor information if actorId is provided
    if (dto.actorId) {
      try {
        const actor = await this.userService.findById(dto.actorId);
        if (actor) {
          variables.actorId = actor.id;
          variables.actorName = actor.name || actor.username;
          variables.actorAvatar = actor.avatarUrl;
        }
      } catch (error) {
        this.logger.warn(`Error fetching actor info: ${error.message}`);
      }
    }
    
    // Add recipient information
    try {
      const recipient = await this.userService.findById(dto.userId);
      if (recipient) {
        variables.userId = recipient.id;
        variables.userName = recipient.name || recipient.username;
        variables.userAvatar = recipient.avatarUrl;
      }
    } catch (error) {
      this.logger.warn(`Error fetching recipient info: ${error.message}`);
    }
    
    return variables;
  }
}

// Make TypeORM In operator available
import { In } from 'typeorm';
