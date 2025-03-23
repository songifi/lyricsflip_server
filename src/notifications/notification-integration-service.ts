import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationFactoryService } from './notification-factory.service';
import { NotificationGateway } from './notification.gateway';
import { ContentType, NotificationType } from './notification.schema';

/**
 * Service to integrate notifications with other system events
 * Listens to events from other modules and creates notifications
 */
@Injectable()
export class NotificationIntegrationService {
  private readonly logger = new Logger(NotificationIntegrationService.name);

  constructor(
    private readonly notificationFactory: NotificationFactoryService,
    private readonly notificationGateway: NotificationGateway
  ) {}

  /**
   * Handle user followed event
   */
  @OnEvent('user.followed')
  async handleUserFollowedEvent(payload: {
    followerId: string;
    followingId: string;
    followerName: string;
  }): Promise<void> {
    try {
      const { followerId, followingId, followerName } = payload;
      
      // Create notification in database
      await this.notificationFactory.createFollowNotification(
        followingId,
        followerId,
        followerName
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(followingId)) {
        this.notificationGateway.sendNotificationToUser(followingId, {
          type: NotificationType.FOLLOW,
          title: 'New Follower',
          body: `${followerName} started following you`,
          contentType: ContentType.USER,
          contentId: followerId,
          actorId: followerId,
          metadata: {
            actorName: followerName
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling user followed event: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle post liked event
   */
  @OnEvent('post.liked')
  async handlePostLikedEvent(payload: {
    postId: string;
    postTitle: string;
    authorId: string;
    likerId: string;
    likerName: string;
  }): Promise<void> {
    try {
      const { postId, postTitle, authorId, likerId, likerName } = payload;
      
      // Don't notify users for their own actions
      if (authorId === likerId) {
        return;
      }
      
      // Create notification in database
      await this.notificationFactory.createLikeNotification(
        authorId,
        likerId,
        likerName,
        ContentType.POST,
        postId,
        postTitle
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(authorId)) {
        this.notificationGateway.sendNotificationToUser(authorId, {
          type: NotificationType.LIKE,
          title: 'New Like',
          body: `${likerName} liked your post`,
          contentType: ContentType.POST,
          contentId: postId,
          actorId: likerId,
          metadata: {
            actorName: likerName,
            contentTitle: postTitle
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling post liked event: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle comment created event
   */
  @OnEvent('comment.created')
  async handleCommentCreatedEvent(payload: {
    commentId: string;
    commentText: string;
    postId: string;
    postTitle: string;
    authorId: string;
    commenterId: string;
    commenterName: string;
  }): Promise<void> {
    try {
      const { 
        commentId, 
        commentText, 
        postId, 
        postTitle, 
        authorId, 
        commenterId, 
        commenterName 
      } = payload;
      
      // Don't notify users for their own actions
      if (authorId === commenterId) {
        return;
      }
      
      // Create notification in database
      await this.notificationFactory.createCommentNotification(
        authorId,
        commenterId,
        commenterName,
        ContentType.POST,
        postId,
        postTitle,
        commentId,
        commentText
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(authorId)) {
        this.notificationGateway.sendNotificationToUser(authorId, {
          type: NotificationType.COMMENT,
          title: 'New Comment',
          body: `${commenterName} commented on your post`,
          contentType: ContentType.POST,
          contentId: postId,
          actorId: commenterId,
          metadata: {
            actorName: commenterName,
            contentTitle: postTitle,
            commentId,
            commentText: commentText.length > 100 ? `${commentText.substring(0, 97)}...` : commentText
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling comment created event: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle user mentioned event
   */
  @OnEvent('user.mentioned')
  async handleUserMentionedEvent(payload: {
    mentionedUserId: string;
    mentionerId: string;
    mentionerName: string;
    contentType: string;
    contentId: string;
    mentionText: string;
  }): Promise<void> {
    try {
      const { 
        mentionedUserId, 
        mentionerId, 
        mentionerName, 
        contentType: contentTypeStr, 
        contentId, 
        mentionText 
      } = payload;
      
      // Convert string contentType to enum
      const contentType = contentTypeStr as ContentType;
      
      // Don't notify users for their own actions
      if (mentionedUserId === mentionerId) {
        return;
      }
      
      // Create notification in database
      await this.notificationFactory.createMentionNotification(
        mentionedUserId,
        mentionerId,
        mentionerName,
        contentType,
        contentId,
        mentionText
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(mentionedUserId)) {
        this.notificationGateway.sendNotificationToUser(mentionedUserId, {
          type: NotificationType.MENTION,
          title: 'New Mention',
          body: `${mentionerName} mentioned you in a ${contentType.toLowerCase()}`,
          contentType,
          contentId,
          actorId: mentionerId,
          metadata: {
            actorName: mentionerName,
            mentionText: mentionText.length > 100 ? `${mentionText.substring(0, 97)}...` : mentionText
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling user mentioned event: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Handle post shared event
   */
  @OnEvent('post.shared')
  async handlePostSharedEvent(payload: {
    postId: string;
    postTitle: string;
    authorId: string;
    sharerId: string;
    sharerName: string;
  }): Promise<void> {
    try {
      const { postId, postTitle, authorId, sharerId, sharerName } = payload;
      
      // Don't notify users for their own actions
      if (authorId === sharerId) {
        return;
      }
      
      // Create notification in database
      await this.notificationFactory.createShareNotification(
        authorId,
        sharerId,
        sharerName,
        ContentType.POST,
        postId,
        postTitle
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(authorId)) {
        this.notificationGateway.sendNotificationToUser(authorId, {
          type: NotificationType.SHARE,
          title: 'New Share',
          body: `${sharerName} shared your post`,
          contentType: ContentType.POST,
          contentId: postId,
          actorId: sharerId,
          metadata: {
            actorName: sharerName,
            contentTitle: postTitle
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling post shared event: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Handle friend request event
   */
  @OnEvent('friend.request')
  async handleFriendRequestEvent(payload: {
    requestId: string;
    recipientId: string;
    requesterId: string;
    requesterName: string;
  }): Promise<void> {
    try {
      const { requestId, recipientId, requesterId, requesterName } = payload;
      
      // Create notification in database
      await this.notificationFactory.createFriendRequestNotification(
        recipientId,
        requesterId,
        requesterName,
        requestId
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(recipientId)) {
        this.notificationGateway.sendNotificationToUser(recipientId, {
          type: NotificationType.FRIEND_REQUEST,
          title: 'New Friend Request',
          body: `${requesterName} sent you a friend request`,
          contentType: ContentType.USER,
          contentId: requesterId,
          actorId: requesterId,
          metadata: {
            actorName: requesterName,
            requestId
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling friend request event: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Handle new message event
   */
  @OnEvent('message.created')
  async handleNewMessageEvent(payload: {
    messageId: string;
    messageText: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    recipientId: string;
  }): Promise<void> {
    try {
      const { 
        messageId, 
        messageText, 
        conversationId, 
        senderId, 
        senderName, 
        recipientId 
      } = payload;
      
      // Create notification in database
      await this.notificationFactory.createMessageNotification(
        recipientId,
        senderId,
        senderName,
        messageId,
        messageText,
        conversationId
      );
      
      // Send real-time notification if user is online
      if (this.notificationGateway.isUserOnline(recipientId)) {
        this.notificationGateway.sendNotificationToUser(recipientId, {
          type: NotificationType.MESSAGE,
          title: 'New Message',
          body: `${senderName} sent you a message`,
          contentType: ContentType.MESSAGE,
          contentId: messageId,
          actorId: senderId,
          metadata: {
            actorName: senderName,
            messageText: messageText.length > 100 ? `${messageText.substring(0, 97)}...` : messageText,
            conversationId
          },
          createdAt: new Date()
        });
      }
    } catch (error) {
      this.logger.error(`Error handling new message event: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Send a system notification to specific users or all users
   */
  async sendSystemNotification(
    title: string,
    body: string,
    userIds?: string[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      if (!userIds || userIds.length === 0) {
        // This would be a way to notify all users, but be careful with this!
        // In a real app, you'd likely use a job queue to handle this
        // and process it in batches
        this.logger.warn('Attempted to send system notification to all users. Not implemented.');
        return;
      }
      
      // Create notifications in database for each user
      for (const userId of userIds) {
        await this.notificationFactory.createSystemNotification(
          userId,
          title,
          body,
          metadata
        );
        
        // Send real-time notification if user is online
        if (this.notificationGateway.isUserOnline(userId)) {
          this.notificationGateway.sendNotificationToUser(userId, {
            type: NotificationType.SYSTEM,
            title,
            body,
            contentType: ContentType.SYSTEM,
            metadata,
            createdAt: new Date()
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error sending system notification: ${error.message}`, error.stack);
    }
  }
}
