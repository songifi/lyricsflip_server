import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../notification/notification.service';

import {
  UserFollowedEvent,
  UserUnfollowedEvent,
  FollowRequestCreatedEvent,
  FollowRequestApprovedEvent,
  FollowRequestRejectedEvent,
  FollowRequestCanceledEvent,
  FollowCountUpdatedEvent,
  FollowRateLimitExceededEvent
} from './follow.events';

@Injectable()
export class FollowEventListeners {
  private readonly logger = new Logger(FollowEventListeners.name);

  constructor(
    private readonly notificationService: NotificationService
  ) {}

  @OnEvent('follow.created')
  async handleUserFollowedEvent(event: UserFollowedEvent) {
    this.logger.log(`User ${event.followerId} followed user ${event.followingId}`);
    
    // Send notification to the user who was followed
    await this.notificationService.sendNotification({
      userId: event.followingId,
      type: 'FOLLOW',
      title: 'New Follower',
      body: 'Someone started following you',
      data: {
        followerId: event.followerId,
        followId: event.follow.id
      }
    });
  }

  @OnEvent('follow.deleted')
  async handleUserUnfollowedEvent(event: UserUnfollowedEvent) {
    this.logger.log(`User ${event.followerId} unfollowed user ${event.followingId}`);
    
    // We typically don't notify on unfollows
    // But we could log it or trigger other actions
  }

  @OnEvent('follow.request.created')
  async handleFollowRequestCreatedEvent(event: FollowRequestCreatedEvent) {
    this.logger.log(`Follow request created: ${event.followRequest.id}`);
    
    // Send notification to the request recipient
    await this.notificationService.sendNotification({
      userId: event.followRequest.recipientId,
      type: 'FOLLOW_REQUEST',
      title: 'New Follow Request',
      body: 'Someone wants to follow you',
      data: {
        requesterId: event.followRequest.requesterId,
        requestId: event.followRequest.id
      }
    });
  }

  @OnEvent('follow.request.approved')
  async handleFollowRequestApprovedEvent(event: FollowRequestApprovedEvent) {
    this.logger.log(`Follow request approved: ${event.followRequest.id}`);
    
    // Send notification to the requester
    await this.notificationService.sendNotification({
      userId: event.followRequest.requesterId,
      type: 'FOLLOW_REQUEST_APPROVED',
      title: 'Follow Request Approved',
      body: 'Your follow request was approved',
      data: {
        recipientId: event.followRequest.recipientId,
        followId: event.follow.id
      }
    });
  }

  @OnEvent('follow.request.rejected')
  async handleFollowRequestRejectedEvent(event: FollowRequestRejectedEvent) {
    this.logger.log(`Follow request rejected: ${event.followRequest.id}`);
    
    // Send notification to the requester
    await this.notificationService.sendNotification({
      userId: event.followRequest.requesterId,
      type: 'FOLLOW_REQUEST_REJECTED',
      title: 'Follow Request Rejected',
      body: 'Your follow request was rejected',
      data: {
        recipientId: event.followRequest.recipientId
      }
    });
  }

  @OnEvent('follow.request.canceled')
  async handleFollowRequestCanceledEvent(event: FollowRequestCanceledEvent) {
    this.logger.log(`Follow request canceled: ${event.requesterId} -> ${event.recipientId}`);
    
    // We typically don't notify on cancellations
    // But we could log it or trigger other actions
  }

  @OnEvent('follow.count.updated')
  async handleFollowCountUpdatedEvent(event: FollowCountUpdatedEvent) {
    this.logger.debug(
      `Follow counts updated for user ${event.userId}: ` +
      `${event.followerCount} followers, ${event.followingCount} following`
    );
    
    // No notification needed, but could update real-time counters or analytics
  }

  @OnEvent('follow.rateLimit.exceeded')
  async handleFollowRateLimitExceededEvent(event: FollowRateLimitExceededEvent) {
    this.logger.warn(
      `Rate limit exceeded: User ${event.userId} tried to follow ${event.targetUserId}`
    );
    
    // Log suspicious activity if rate limits are frequently hit
    if (this.isFrequentRateLimitViolation(event.userId)) {
      this.logger.warn(`Frequent rate limit violations from user ${event.userId}`);
      
      // Could trigger security alerts or temporary restrictions
    }
  }
  
  /**
   * Helper to track frequent rate limit violations
   * (In a real app, this would use Redis or similar to track across instances)
   */
  private isFrequentRateLimitViolation(userId: string): boolean {
    // Implementation would track violations with timestamps
    // For this example, we'll just return false
    return false;
  }
}
