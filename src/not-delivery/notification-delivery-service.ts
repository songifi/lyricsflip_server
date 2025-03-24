import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationBatchRepository } from './notification-batch.repository';
import { NotificationRepository } from './notification.repository';
import { 
  Notification, 
  NotificationChannel, 
  NotificationStatus 
} from './notification.entity';
import { NotificationBatch, BatchStatus } from './notification-batch.entity';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { NotificationGateway } from './notification.gateway';
import { EmailService } from '../email/email.service';
import { PushNotificationService } from '../push-notification/push-notification.service';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  
  // Batch size for different channels
  private readonly BATCH_SIZES = {
    [NotificationChannel.IN_APP]: 1000,
    [NotificationChannel.PUSH]: 500,
    [NotificationChannel.EMAIL]: 200,
    [NotificationChannel.SMS]: 100
  };
  
  // Rate limits per minute for different channels
  private readonly RATE_LIMITS = {
    [NotificationChannel.IN_APP]: 10000,
    [NotificationChannel.PUSH]: 2000,
    [NotificationChannel.EMAIL]: 500,
    [NotificationChannel.SMS]: 100
  };

  constructor(
    @InjectRepository(NotificationBatchRepository)
    private readonly batchRepository: NotificationBatchRepository,
    @InjectRepository(NotificationRepository)
    private readonly notificationRepository: NotificationRepository,
    private readonly rateLimiterService: RateLimiterService,
    private readonly notificationGateway: NotificationGateway,
    private readonly emailService: EmailService,
    private readonly pushService: PushNotificationService
  ) {}

  /**
   * Create batches for pending notifications
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async createBatches(): Promise<void> {
    try {
      // Process different channels
      for (const channel of Object.values(NotificationChannel)) {
        await this.createBatchForChannel(channel);
      }
    } catch (error) {
      this.logger.error(`Error creating notification batches: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Create a batch for notifications of a specific channel
   */
  private async createBatchForChannel(channel: NotificationChannel): Promise<void> {
    try {
      const batchSize = this.BATCH_SIZES[channel] || 100;
      
      // Get pending notifications for this channel
      const notifications = await this.notificationRepository.getNotificationsForBatch(
        channel,
        batchSize
      );
      
      if (notifications.length === 0) {
        return;
      }
      
      // Create batch
      const notificationIds = notifications.map(n => n.id);
      await this.batchRepository.createBatch(channel, notificationIds);
      
      this.logger.log(`Created batch for ${notifications.length} ${channel} notifications`);
    } catch (error) {
      this.logger.error(`Error creating batch for ${channel}: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Process pending notification batches
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processBatches(): Promise<void> {
    try {
      // Get batches ready for processing (limiting to 5 at a time)
      const batches = await this.batchRepository.findReadyBatches(5);
      
      // Process each batch concurrently
      await Promise.all(batches.map(batch => this.processBatch(batch)));
      
      // Check for stalled batches
      const stalledBatches = await this.batchRepository.findStalledBatches();
      for (const batch of stalledBatches) {
        this.logger.warn(`Found stalled batch: ${batch.id}, resuming processing`);
        await this.processBatch(batch);
      }
    } catch (error) {
      this.logger.error(`Error processing batches: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Process a single notification batch
   */
  private async processBatch(batch: NotificationBatch): Promise<void> {
    try {
      // Mark batch as processing
      await this.batchRepository.startProcessing(batch.id);
      
      // Get notifications for this batch
      const notifications = await this.notificationRepository.findByIds(batch.notificationIds);
      
      // Track progress
      let processedCount = 0;
      let successCount = 0;
      let failureCount = 0;
      
      // Check if we can process this batch based on rate limits
      if (!await this.checkRateLimit(batch.channel, notifications.length)) {
        // Reschedule for later
        const scheduledFor = new Date();
        scheduledFor.setMinutes(scheduledFor.getMinutes() + 5);
        
        await this.batchRepository.update(batch.id, {
          status: BatchStatus.PENDING,
          scheduledFor
        });
        
        this.logger.warn(`Rate limit reached for ${batch.channel}, rescheduled batch ${batch.id}`);
        return;
      }
      
      // Process notifications in smaller chunks to update progress
      const chunkSize = 100;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        
        // Process chunk
        const results = await Promise.all(
          chunk.map(notification => this.deliverNotification(notification))
        );
        
        // Update counts
        processedCount += results.length;
        successCount += results.filter(r => r).length;
        failureCount += results.filter(r => !r).length;
        
        // Update progress
        await this.batchRepository.updateProgress(
          batch.id,
          processedCount,
          successCount,
          failureCount
        );
      }
      
      // Mark batch as completed
      await this.batchRepository.completeBatch(
        batch.id,
        processedCount,
        successCount,
        failureCount
      );
      
      this.logger.log(
        `Completed batch ${batch.id}: ${successCount} successful, ${failureCount} failed`
      );
    } catch (error) {
      this.logger.error(`Error processing batch ${batch.id}: ${error.message}`, error.stack);
      
      // Mark batch as failed
      await this.batchRepository.failBatch(batch.id, { error: error.message });
    }
  }
  
  /**
   * Deliver a single notification
   */
  private async deliverNotification(notification: Notification): Promise<boolean> {
    try {
      let success = false;
      
      switch (notification.channel) {
        case NotificationChannel.IN_APP:
          success = await this.deliverInAppNotification(notification);
          break;
        case NotificationChannel.PUSH:
          success = await this.deliverPushNotification(notification);
          break;
        case NotificationChannel.EMAIL:
          success = await this.deliverEmailNotification(notification);
          break;
        case NotificationChannel.SMS:
          success = await this.deliverSmsNotification(notification);
          break;
        default:
          this.logger.warn(`Unknown notification channel: ${notification.channel}`);
          success = false;
      }
      
      // Update notification status
      if (success) {
        await this.notificationRepository.update(notification.id, {
          status: NotificationStatus.DELIVERED,
          deliveredAt: new Date()
        });
      } else {
        await this.notificationRepository.update(notification.id, {
          status: NotificationStatus.FAILED
        });
      }
      
      return success;
    } catch (error) {
      this.logger.error(
        `Error delivering notification ${notification.id}: ${error.message}`,
        error.stack
      );
      
      // Update notification status
      await this.notificationRepository.update(notification.id, {
        status: NotificationStatus.FAILED,
        metadata: { ...notification.metadata, error: error.message }
      });
      
      return false;
    }
  }
  
  /**
   * Deliver in-app notification via WebSocket
   */
  private async deliverInAppNotification(notification: Notification): Promise<boolean> {
    try {
      // Check if user is online
      const isOnline = this.notificationGateway.isUserOnline(notification.userId);
      
      if (isOnline) {
        // Send notification via WebSocket
        this.notificationGateway.sendNotification(notification);
      }
      
      // Always mark as delivered, even if user is offline
      // They'll see it when they next connect
      return true;
    } catch (error) {
      this.logger.error(
        `Error delivering in-app notification ${notification.id}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }
  
  /**
   * Deliver push notification
   */
  private async deliverPushNotification(notification: Notification): Promise<boolean> {
    try {
      return await this.pushService.sendPushNotification({
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        notificationId: notification.id
      });
    } catch (error) {
      this.logger.error(
        `Error delivering push notification ${notification.id}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }
  
  /**
   * Deliver email notification
   */
  private async deliverEmailNotification(notification: Notification): Promise<boolean> {
    try {
      return await this.emailService.sendNotificationEmail({
        userId: notification.userId,
        subject: notification.title,
        text: notification.body,
        html: `<p>${notification.body}</p>`,
        data: notification.data,
        notificationId: notification.id
      });
    } catch (error) {
      this.logger.error(
        `Error delivering email notification ${notification.id}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }
  
  /**
   * Deliver SMS notification
   */
  private async deliverSmsNotification(notification: Notification): Promise<boolean> {
    // This would integrate with an SMS service
    // For this example, we'll just log and return success
    this.logger.log(`Would send SMS to user ${notification.userId}: ${notification.body}`);
    return true;
  }
  
  /**
   * Check if we can process notifications based on rate limits
   */
  private async checkRateLimit(
    channel: NotificationChannel,
    count: number
  ): Promise<boolean> {
    const limit = this.RATE_LIMITS[channel] || 100;
    const key = `notification:ratelimit:${channel}`;
    
    // Check if we have capacity
    const currentCount = await this.rateLimiterService.getValue(key) || 0;
    
    if (currentCount + count > limit) {
      return false;
    }
    
    // Increment counter (expires after 60 seconds)
    await this.rateLimiterService.increment(key, count, 60);
    
    return true;
  }
  
  /**
   * Clean up old notification batches
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldBatches(): Promise<void> {
    try {
      const deleted = await this.batchRepository.cleanupOldBatches(30);
      this.logger.log(`Cleaned up ${deleted} old notification batches`);
    } catch (error) {
      this.logger.error(`Error cleaning up old batches: ${error.message}`, error.stack);
    }
  }
}
