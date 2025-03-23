import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './notification.dto';
import { NotificationType, ContentType } from './notification.schema';

/**
 * Factory service to simplify creating different types of notifications
 */
@Injectable()
export class NotificationFactoryService {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Create a follow notification
   */
  async createFollowNotification(
    userId: string,
    actorId: string,
    actorName: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.FOLLOW,
      actorId,
      contentType: ContentType.USER,
      contentId: actorId,
      title: 'New Follower',
      body: `${actorName} started following you`,
      metadata: {
        actorName
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a like notification
   */
  async createLikeNotification(
    userId: string,
    actorId: string,
    actorName: string,
    contentType: ContentType,
    contentId: string,
    contentTitle: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.LIKE,
      actorId,
      contentType,
      contentId,
      title: 'New Like',
      body: `${actorName} liked your ${contentType.toLowerCase()}`,
      metadata: {
        actorName,
        contentTitle
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a comment notification
   */
  async createCommentNotification(
    userId: string,
    actorId: string,
    actorName: string,
    contentType: ContentType,
    contentId: string,
    contentTitle: string,
    commentId: string,
    commentText: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.COMMENT,
      actorId,
      contentType,
      contentId,
      title: 'New Comment',
      body: `${actorName} commented on your ${contentType.toLowerCase()}`,
      metadata: {
        actorName,
        contentTitle,
        commentId,
        commentText: commentText.length > 100 ? `${commentText.substring(0, 97)}...` : commentText
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a mention notification
   */
  async createMentionNotification(
    userId: string,
    actorId: string,
    actorName: string,
    contentType: ContentType,
    contentId: string,
    mentionText: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.MENTION,
      actorId,
      contentType,
      contentId,
      title: 'New Mention',
      body: `${actorName} mentioned you in a ${contentType.toLowerCase()}`,
      metadata: {
        actorName,
        mentionText: mentionText.length > 100 ? `${mentionText.substring(0, 97)}...` : mentionText
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a share notification
   */
  async createShareNotification(
    userId: string,
    actorId: string,
    actorName: string,
    contentType: ContentType,
    contentId: string,
    contentTitle: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.SHARE,
      actorId,
      contentType,
      contentId,
      title: 'New Share',
      body: `${actorName} shared your ${contentType.toLowerCase()}`,
      metadata: {
        actorName,
        contentTitle
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a friend request notification
   */
  async createFriendRequestNotification(
    userId: string,
    actorId: string,
    actorName: string,
    requestId: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.FRIEND_REQUEST,
      actorId,
      contentType: ContentType.USER,
      contentId: actorId,
      title: 'New Friend Request',
      body: `${actorName} sent you a friend request`,
      metadata: {
        actorName,
        requestId
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a message notification
   */
  async createMessageNotification(
    userId: string,
    actorId: string,
    actorName: string,
    messageId: string,
    messageText: string,
    conversationId: string
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.MESSAGE,
      actorId,
      contentType: ContentType.MESSAGE,
      contentId: messageId,
      title: 'New Message',
      body: `${actorName} sent you a message`,
      metadata: {
        actorName,
        messageText: messageText.length > 100 ? `${messageText.substring(0, 97)}...` : messageText,
        conversationId
      }
    };

    await this.notificationService.create(notification);
  }

  /**
   * Create a system notification
   */
  async createSystemNotification(
    userId: string,
    title: string,
    body: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const notification: CreateNotificationDto = {
      userId,
      type: NotificationType.SYSTEM,
      contentType: ContentType.SYSTEM,
      title,
      body,
      metadata
    };

    await this.notificationService.create(notification);
  }
}
