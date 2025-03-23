import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
import { 
  CreateNotificationDto, 
  UpdateNotificationDto, 
  NotificationQueryDto,
  NotificationCountDto,
  NotificationBulkReadDto 
} from './notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>
  ) {}

  /**
   * Create a new notification
   */
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    try {
      const notification = new this.notificationModel(createNotificationDto);
      return await notification.save();
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create multiple notifications at once (batch creation)
   */
  async createMany(createNotificationDtos: CreateNotificationDto[]): Promise<number> {
    try {
      const result = await this.notificationModel.insertMany(createNotificationDtos);
      return result.length;
    } catch (error) {
      this.logger.error(`Error creating multiple notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all notifications for a user with filtering options
   */
  async findAll(userId: string, queryDto: NotificationQueryDto): Promise<Notification[]> {
    try {
      const { 
        type, 
        read, 
        contentType, 
        contentId, 
        actorId, 
        limit = 20, 
        skip = 0, 
        sort = 'desc' 
      } = queryDto;
      
      // Build query
      const query: any = { userId };
      
      if (type !== undefined) {
        query.type = type;
      }
      
      if (read !== undefined) {
        query.read = read;
      }
      
      if (contentType !== undefined) {
        query.contentType = contentType;
      }
      
      if (contentId !== undefined) {
        query.contentId = contentId;
      }
      
      if (actorId !== undefined) {
        query.actorId = actorId;
      }
      
      // Execute query with pagination and sorting
      return this.notificationModel.find(query)
        .sort({ createdAt: sort === 'asc' ? 1 : -1 })
        .limit(limit)
        .skip(skip)
        .exec();
    } catch (error) {
      this.logger.error(`Error finding notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find a single notification by ID
   */
  async findOne(id: string): Promise<Notification> {
    try {
      const notification = await this.notificationModel.findById(id).exec();
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      return notification;
    } catch (error) {
      this.logger.error(`Error finding notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a notification
   */
  async update(id: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    try {
      const notification = await this.notificationModel.findByIdAndUpdate(
        id,
        { $set: updateNotificationDto },
        { new: true }
      ).exec();
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      return notification;
    } catch (error) {
      this.logger.error(`Error updating notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<Notification> {
    try {
      const notification = await this.notificationModel.findByIdAndUpdate(
        id,
        { $set: { read: true } },
        { new: true }
      ).exec();
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      return notification;
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark a notification as unread
   */
  async markAsUnread(id: string): Promise<Notification> {
    try {
      const notification = await this.notificationModel.findByIdAndUpdate(
        id,
        { $set: { read: false } },
        { new: true }
      ).exec();
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      
      return notification;
    } catch (error) {
      this.logger.error(`Error marking notification as unread: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(bulkReadDto: NotificationBulkReadDto): Promise<number> {
    try {
      const result = await this.notificationModel.updateMany(
        { _id: { $in: bulkReadDto.ids } },
        { $set: { read: true } }
      ).exec();
      
      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`Error marking multiple notifications as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark all user's notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.notificationModel.updateMany(
        { userId, read: false },
        { $set: { read: true } }
      ).exec();
      
      return result.modifiedCount;
    } catch (error) {
      this.logger.error(`Error marking all notifications as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async remove(id: string): Promise<void> {
    try {
      const notification = await this.notificationModel.findByIdAndDelete(id).exec();
      
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
    } catch (error) {
      this.logger.error(`Error removing notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  async removeMany(ids: string[]): Promise<number> {
    try {
      const result = await this.notificationModel.deleteMany(
        { _id: { $in: ids } }
      ).exec();
      
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Error removing multiple notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete all notifications for a user
   */
  async removeAllForUser(userId: string): Promise<number> {
    try {
      const result = await this.notificationModel.deleteMany({ userId }).exec();
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Error removing all notifications for user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Count total and unread notifications for a user
   */
  async countNotifications(userId: string): Promise<NotificationCountDto> {
    try {
      const [total, unread] = await Promise.all([
        this.notificationModel.countDocuments({ userId }).exec(),
        this.notificationModel.countDocuments({ userId, read: false }).exec()
      ]);
      
      return { total, unread };
    } catch (error) {
      this.logger.error(`Error counting notifications: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find the latest notifications for multiple users
   * Useful for fetching notifications for a dashboard
   */
  async findLatestForUsers(userIds: string[], limit: number = 5): Promise<Record<string, Notification[]>> {
    try {
      const notifications = await this.notificationModel.find({
        userId: { $in: userIds }
      })
      .sort({ createdAt: -1 })
      .limit(userIds.length * limit)
      .exec();
      
      // Group by userId
      const result: Record<string, Notification[]> = {};
      
      for (const userId of userIds) {
        const userNotifications = notifications
          .filter(n => n.userId === userId)
          .slice(0, limit);
        
        result[userId] = userNotifications;
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error finding latest notifications for users: ${error.message}`, error.stack);
      throw error;
    }
  }
}
