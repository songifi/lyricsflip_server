import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  UserBlockedEvent,
  UserUnblockedEvent,
  BlockListUpdatedEvent
} from './block.events';
import { Block } from './block.entity';
import { NotificationService } from '../notification/notification.service';
import { FollowService } from '../follow/follow.service';
import { RecommendationService } from '../recommendation/recommendation.service';

@Injectable()
export class BlockEventListeners {
  private readonly logger = new Logger(BlockEventListeners.name);

  constructor(
    @InjectRepository(Block)
    private blockRepository: Repository<Block>,
    private notificationService: NotificationService,
    private followService: FollowService,
    private recommendationService: RecommendationService
  ) {}

  @OnEvent('user.blocked')
  async handleUserBlockedEvent(event: UserBlockedEvent) {
    this.logger.log(`User ${event.blockerId} blocked user ${event.blockedId}`);
    
    try {
      // Auto-unfollow when a user is blocked
      await this.handleAutoUnfollow(event.blockerId, event.blockedId);
      
      // Update recommendations to exclude blocked user
      await this.refreshRecommendations(event.blockerId);
      
      // No notification to the blocked user (they shouldn't know they were blocked)
    } catch (error) {
      this.logger.error(`Error handling block event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('user.unblocked')
  async handleUserUnblockedEvent(event: UserUnblockedEvent) {
    this.logger.log(`User ${event.blockerId} unblocked user ${event.blockedId}`);
    
    try {
      // Update recommendations when a user is unblocked
      await this.refreshRecommendations(event.blockerId);
      
      // No notification to the unblocked user (they shouldn't know they were blocked in the first place)
    } catch (error) {
      this.logger.error(`Error handling unblock event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('block.list.updated')
  async handleBlockListUpdatedEvent(event: BlockListUpdatedEvent) {
    this.logger.debug(`Block list updated for user ${event.userId}, count: ${event.blockCount}`);
    
    // This event could be used for analytics or other statistical purposes
  }

  /**
   * When a user blocks another user, automatically unfollow in both directions
   */
  private async handleAutoUnfollow(blockerId: string, blockedId: string): Promise<void> {
    try {
      // Check if the blocker is following the blocked user
      const isFollowing = await this.followService.isFollowing(blockerId, blockedId);
      if (isFollowing) {
        await this.followService.unfollowUser({
          id: blockerId
        } as any, {
          userId: blockedId
        });
      }
      
      // Check if the blocked user is following the blocker
      const isFollowedBy = await this.followService.isFollowing(blockedId, blockerId);
      if (isFollowedBy) {
        // This is an administrative action, so we're bypassing normal auth checks
        await this.followService.adminRemoveFollow(blockedId, blockerId, 'user_blocked');
      }
    } catch (error) {
      this.logger.error(`Error in auto-unfollow: ${error.message}`, error.stack);
    }
  }

  /**
   * Refresh user recommendations when block list changes
   */
  private async refreshRecommendations(userId: string): Promise<void> {
    try {
      await this.recommendationService.invalidateUserRecommendations(userId);
    } catch (error) {
      this.logger.error(`Error refreshing recommendations: ${error.message}`, error.stack);
    }
  }
}
