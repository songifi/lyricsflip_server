import { EntityRepository, Repository } from 'typeorm';
import { NotificationTemplate } from './notification-template.entity';
import { NotificationType, NotificationChannel } from './notification.entity';

@EntityRepository(NotificationTemplate)
export class NotificationTemplateRepository extends Repository<NotificationTemplate> {
  /**
   * Find a template by type and channel
   */
  async findByTypeAndChannel(
    type: NotificationType,
    channel: NotificationChannel = NotificationChannel.IN_APP
  ): Promise<NotificationTemplate | undefined> {
    return this.findOne({
      where: { type, channel, active: true }
    });
  }
  
  /**
   * Find all active templates
   */
  async findAllActive(): Promise<NotificationTemplate[]> {
    return this.find({
      where: { active: true }
    });
  }
  
  /**
   * Create default templates for all notification types
   */
  async createDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        type: NotificationType.NEW_FOLLOWER,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'New Follower',
        bodyTemplate: '{{actorName}} started following you',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          actorAvatar: '{{actorAvatar}}'
        }
      },
      {
        type: NotificationType.NEW_LIKE,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'New Like',
        bodyTemplate: '{{actorName}} liked your {{contentType}}',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          contentId: '{{contentId}}',
          contentType: '{{contentType}}'
        }
      },
      {
        type: NotificationType.NEW_COMMENT,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'New Comment',
        bodyTemplate: '{{actorName}} commented on your {{contentType}}',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          contentId: '{{contentId}}',
          contentType: '{{contentType}}',
          commentId: '{{commentId}}',
          commentText: '{{commentText}}'
        }
      },
      {
        type: NotificationType.MENTION,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'New Mention',
        bodyTemplate: '{{actorName}} mentioned you in a {{contentType}}',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          contentId: '{{contentId}}',
          contentType: '{{contentType}}'
        }
      },
      {
        type: NotificationType.NEW_MESSAGE,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'New Message',
        bodyTemplate: '{{actorName}} sent you a message',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          messageId: '{{messageId}}',
          conversationId: '{{conversationId}}',
          messageText: '{{messageText}}'
        }
      },
      {
        type: NotificationType.FRIEND_REQUEST,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'New Friend Request',
        bodyTemplate: '{{actorName}} sent you a friend request',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          requestId: '{{requestId}}'
        }
      },
      {
        type: NotificationType.FRIEND_ACCEPT,
        channel: NotificationChannel.IN_APP,
        titleTemplate: 'Friend Request Accepted',
        bodyTemplate: '{{actorName}} accepted your friend request',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}'
        }
      },
      {
        type: NotificationType.SYSTEM,
        channel: NotificationChannel.IN_APP,
        titleTemplate: '{{title}}',
        bodyTemplate: '{{body}}',
        dataTemplate: {
          systemData: '{{systemData}}'
        }
      },
      // Email templates (simplified examples)
      {
        type: NotificationType.NEW_FOLLOWER,
        channel: NotificationChannel.EMAIL,
        titleTemplate: 'New Follower on Your Account',
        bodyTemplate: 'Hello, {{userName}}! {{actorName}} started following you on our platform.',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          userName: '{{userName}}'
        }
      },
      // Push notification templates (simplified examples)
      {
        type: NotificationType.NEW_MESSAGE,
        channel: NotificationChannel.PUSH,
        titleTemplate: '{{actorName}}',
        bodyTemplate: 'Sent you a message: {{messagePreview}}',
        dataTemplate: {
          actorId: '{{actorId}}',
          actorName: '{{actorName}}',
          messageId: '{{messageId}}',
          conversationId: '{{conversationId}}',
          messagePreview: '{{messagePreview}}'
        }
      }
    ];
    
    // Create templates one by one
    for (const template of defaultTemplates) {
      // Check if template already exists
      const existing = await this.findOne({
        where: {
          type: template.type,
          channel: template.channel
        }
      });
      
      if (!existing) {
        await this.save(template);
      }
    }
  }
}
