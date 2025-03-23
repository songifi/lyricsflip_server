import { 
  Injectable, 
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, EntityManager, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { FollowRepository } from './follow.repository';
import { FollowRequestRepository } from './follow-request.repository';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { FollowCacheService } from './follow-cache.service';
import { UserService } from '../user/user.service';

import { Follow } from './follow.entity';
import { FollowRequest, FollowRequestStatus } from './follow-request.entity';
import { User } from '../user/user.entity';

import {
  FollowUserDto,
  UnfollowUserDto,
  FollowRequestResponseDto,
  FollowListQueryDto,
  PendingRequestsQueryDto,
  FollowSuggestionsQueryDto,
  FollowCountDto
} from './follow.dto';

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
export class FollowService {
  private readonly logger = new Logger(FollowService.name);
  
  constructor(
    @InjectRepository(FollowRepository)
    private readonly followRepository: FollowRepository,
    @InjectRepository(FollowRequestRepository)
    private readonly followRequestRepository: FollowRequestRepository,
    private readonly connection: Connection,
    private readonly eventEmitter: EventEmitter2,
    private readonly rateLimiterService: RateLimiterService,
    private readonly followCacheService: FollowCacheService,
    private readonly userService: UserService
  ) {}
  
  /**
   * Follow a user or send a follow request if the user has a private account
   */
  async followUser(
    currentUser: User, 
    followDto: FollowUserDto
  ): Promise<Follow | FollowRequest> {
    const { userId: targetUserId, note } = followDto;
    
    // Prevent following self
    if (currentUser.id === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    
    // Check if target user exists
    const targetUser = await this.userService.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    
    // Check if already following
    const isFollowing = await this.followRepository.isFollowing(
      currentUser.id, 
      targetUserId
    );
    
    if (isFollowing) {
      throw new ConflictException('You are already following this user');
    }
    
    // Check for existing pending request
    const hasPendingRequest = await this.followRequestRepository.hasPendingRequest(
      currentUser.id, 
      targetUserId
    );
    
    if (hasPendingRequest) {
      throw new ConflictException('You already have a pending follow request to this user');
    }
    
    // Check rate limits
    const hasExceededLimit = await this.rateLimiterService.hasExceededFollowLimit(currentUser.id);
    if (hasExceededLimit) {
      // Emit rate limit exceeded event
      this.eventEmitter.emit(
        'follow.rateLimit.exceeded',
        new FollowRateLimitExceededEvent(currentUser.id, targetUserId)
      );
      
      throw new ConflictException('You have exceeded the follow rate limit');
    }
    
    // Execute in transaction
    return this.connection.transaction(async (manager: EntityManager) => {
      // If user has a private account, create a follow request
      if (targetUser.isPrivate) {
        // Check follow request rate limit
        const hasExceededRequestLimit = await this.rateLimiterService.hasExceededFollowRequestLimit(
          currentUser.id
        );
        
        if (hasExceededRequestLimit) {
          // Emit rate limit exceeded event
          this.eventEmitter.emit(
            'follow.rateLimit.exceeded',
            new FollowRateLimitExceededEvent(currentUser.id, targetUserId)
          );
          
          throw new ConflictException('You have exceeded the follow request rate limit');
        }
        
        // Create follow request
        const followRequest = manager.create(FollowRequest, {
          requesterId: currentUser.id,
          recipientId: targetUserId,
          status: FollowRequestStatus.PENDING,
          note: note
        });
        
        const savedRequest = await manager.save(followRequest);
        
        // Increment rate limit counter
        await this.rateLimiterService.incrementFollowRequestCounter(currentUser.id);
        
        // Emit follow request created event
        this.eventEmitter.emit(
          'follow.request.created',
          new FollowRequestCreatedEvent(savedRequest)
        );
        
        return savedRequest;
      } else {
        // Create direct follow relationship
        const follow = manager.create(Follow, {
          followerId: currentUser.id,
          followingId: targetUserId
        });
        
        const savedFollow = await manager.save(follow);
        
        // Increment rate limit counter
        await this.rateLimiterService.incrementFollowCounter(currentUser.id);
        
        // Update cached counts
        await Promise.all([
          this.followCacheService.incrementFollowerCount(targetUserId),
          this.followCacheService.incrementFollowingCount(currentUser.id)
        ]);
        
        // Get updated counts
        const [followerCount, followingCount] = await Promise.all([
          this.getFollowerCount(currentUser.id),
          this.getFollowingCount(currentUser.id)
        ]);
        
        // Emit events
        this.eventEmitter.emit(
          'follow.created',
          new UserFollowedEvent(currentUser.id, targetUserId, savedFollow)
        );
        
        this.eventEmitter.emit(
          'follow.count.updated',
          new FollowCountUpdatedEvent(
            currentUser.id,
            followerCount,
            followingCount
          )
        );
        
        return savedFollow;
      }
    });
  }
  
  /**
   * Unfollow a user
   */
  async unfollowUser(currentUser: User, unfollowDto: UnfollowUserDto): Promise<void> {
    const { userId: targetUserId } = unfollowDto;
    
    // Check if actually following
    const isFollowing = await this.followRepository.isFollowing(
      currentUser.id, 
      targetUserId
    );
    
    if (!isFollowing) {
      throw new BadRequestException('You are not following this user');
    }
    
    // Execute in transaction
    await this.connection.transaction(async (manager: EntityManager) => {
      // Remove follow relationship
      await manager.delete(Follow, {
        followerId: currentUser.id,
        followingId: targetUserId
      });
      
      // Update cached counts
      await Promise.all([
        this.followCacheService.decrementFollowerCount(targetUserId),
        this.followCacheService.decrementFollowingCount(currentUser.id)
      ]);
      
      // Get updated counts
      const [followerCount, followingCount] = await Promise.all([
        this.getFollowerCount(currentUser.id),
        this.getFollowingCount(currentUser.id)
      ]);
      
      // Emit events
      this.eventEmitter.emit(
        'follow.deleted',
        new UserUnfollowedEvent(currentUser.id, targetUserId)
      );
      
      this.eventEmitter.emit(
        'follow.count.updated',
        new FollowCountUpdatedEvent(
          currentUser.id,
          followerCount,
          followingCount
        )
      );
    });
  }
  
  /**
   * Cancel a pending follow request
   */
  async cancelFollowRequest(currentUser: User, targetUserId: string): Promise<void> {
    // Check if request exists
    const request = await this.followRequestRepository.findRequest(
      currentUser.id, 
      targetUserId
    );
    
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }
    
    if (request.status !== FollowRequestStatus.PENDING) {
      throw new BadRequestException('This request is no longer pending');
    }
    
    // Delete the request
    await this.followRequestRepository.delete(request.id);
    
    // Emit event
    this.eventEmitter.emit(
      'follow.request.canceled',
      new FollowRequestCanceledEvent(currentUser.id, targetUserId)
    );
  }
  
  /**
   * Respond to a follow request (approve or reject)
   */
  async respondToFollowRequest(
    currentUser: User,
    responseDto: FollowRequestResponseDto
  ): Promise<void> {
    const { requestId, approve, note } = responseDto;
    
    // Find the request
    const request = await this.followRequestRepository.findOne(requestId, {
      relations: ['requester']
    });
    
    if (!request) {
      throw new NotFoundException('Follow request not found');
    }
    
    // Ensure the request belongs to the current user
    if (request.recipientId !== currentUser.id) {
      throw new ForbiddenException('This follow request was not sent to you');
    }
    
    // Ensure the request is pending
    if (request.status !== FollowRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }
    
    // Execute in transaction
    await this.connection.transaction(async (manager: EntityManager) => {
      // Update request status
      request.status = approve ? 
        FollowRequestStatus.APPROVED : 
        FollowRequestStatus.REJECTED;
      request.responseDate = new Date();
      
      if (note) {
        request.note = note;
      }
      
      await manager.save(request);
      
      if (approve) {
        // Create follow relationship
        const follow = manager.create(Follow, {
          followerId: request.requesterId,
          followingId: currentUser.id
        });
        
        const savedFollow = await manager.save(follow);
        
        // Update cached counts
        await Promise.all([
          this.followCacheService.incrementFollowerCount(currentUser.id),
          this.followCacheService.incrementFollowingCount(request.requesterId)
        ]);
        
        // Emit approved event
        this.eventEmitter.emit(
          'follow.request.approved',
          new FollowRequestApprovedEvent(request, savedFollow)
        );
        
        // Also emit followed event
        this.eventEmitter.emit(
          'follow.created',
          new UserFollowedEvent(request.requesterId, currentUser.id, savedFollow)
        );
        
        // Get updated counts
        const followerCount = await this.getFollowerCount(request.requesterId);
        const followingCount = await this.getFollowingCount(request.requesterId);
        
        // Emit count updated event
        this.eventEmitter.emit(
          'follow.count.updated',
          new FollowCountUpdatedEvent(
            request.requesterId,
            followerCount,
            followingCount
          )
        );
      } else {
        // Emit rejected event
        this.eventEmitter.emit(
          'follow.request.rejected',
          new FollowRequestRejectedEvent(request)
        );
      }
    });
  }
  
  /**
   * Get followers for a user
   */
  async getFollowers(
    userId: string, 
    queryDto: FollowListQueryDto
  ): Promise<{ followers: User[], total: number }> {
    const [follows, total] = await this.followRepository.getFollowers(userId, queryDto);
    
    // Extract user objects
    const followers = follows.map(follow => follow.follower);
    
    return { followers, total };
  }
  
  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string, 
    queryDto: FollowListQueryDto
  ): Promise<{ following: User[], total: number }> {
    const [follows, total] = await this.followRepository.getFollowing(userId, queryDto);
    
    // Extract user objects
    const following = follows.map(follow => follow.following);
    
    return { following, total };
  }
  
  /**
   * Get pending follow requests received by a user
   */
  async getReceivedRequests(
    userId: string, 
    queryDto: PendingRequestsQueryDto
  ): Promise<{ requests: FollowRequest[], total: number }> {
    const [requests, total] = await this.followRequestRepository.getReceivedRequests(
      userId, 
      queryDto
    );
    
    return { requests, total };
  }
  
  /**
   * Get follow requests sent by a user
   */
  async getSentRequests(
    userId: string, 
    queryDto: PendingRequestsQueryDto
  ): Promise<{ requests: FollowRequest[], total: number }> {
    const [requests, total] = await this.followRequestRepository.getSentRequests(
      userId, 
      queryDto
    );
    
    return { requests, total };
  }
  
  /**
   * Check if a user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return this.followRepository.isFollowing(followerId, followingId);
  }
  
  /**
   * Check if a user has a pending follow request to another user
   */
  async hasPendingRequest(requesterId: string, recipientId: string): Promise<boolean> {
    return this.followRequestRepository.hasPendingRequest(requesterId, recipientId);
  }
  
  /**
   * Get follow status between two users
   */
  async getFollowStatus(
    userId: string, 
    targetUserId: string
  ): Promise<{ 
    isFollowing: boolean;
    isFollowed: boolean;
    hasPendingRequest: boolean;
    hasReceivedRequest: boolean;
  }> {
    const [
      isFollowing,
      isFollowed,
      hasPendingRequest,
      hasReceivedRequest
    ] = await Promise.all([
      this.followRepository.isFollowing(userId, targetUserId),
      this.followRepository.isFollowing(targetUserId, userId),
      this.followRequestRepository.hasPendingRequest(userId, targetUserId),
      this.followRequestRepository.hasPendingRequest(targetUserId, userId)
    ]);
    
    return {
      isFollowing,
      isFollowed,
      hasPendingRequest,
      hasReceivedRequest
    };
  }
  
  /**
   * Get follower count for a user
   */
  async getFollowerCount(userId: string): Promise<number> {
    // Try to get from cache first
    const cachedCount = await this.followCacheService.getCachedFollowerCount(userId);
    
    if (cachedCount !== null) {
      return cachedCount;
    }
    
    // Get from database if not in cache
    const count = await this.followRepository.getFollowerCount(userId);
    
    // Cache the count
    await this.followCacheService.cacheFollowCounts(
      userId,
      count,
      await this.followRepository.getFollowingCount(userId)
    );
    
    return count;
  }
  
  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    // Try to get from cache first
    const cachedCount = await this.followCacheService.getCachedFollowingCount(userId);
    
    if (cachedCount !== null) {
      return cachedCount;
    }
    
    // Get from database if not in cache
    const count = await this.followRepository.getFollowingCount(userId);
    
    // Cache the count
    await this.followCacheService.cacheFollowCounts(
      userId,
      await this.followRepository.getFollowerCount(userId),
      count
    );
    
    return count;
  }
  
  /**
   * Get both follower and following counts for a user
   */
  async getFollowCounts(userId: string): Promise<FollowCountDto> {
    // Try to get from cache first
    const cachedCounts = await this.followCacheService.getCachedFollowCounts(userId);
    
    if (cachedCounts.followerCount !== null && cachedCounts.followingCount !== null) {
      return {
        followerCount: cachedCounts.followerCount,
        followingCount: cachedCounts.followingCount
      };
    }
    
    // Get from database if not in cache
    const [followerCount, followingCount] = await Promise.all([
      this.followRepository.getFollowerCount(userId),
      this.followRepository.getFollowingCount(userId)
    ]);
    
    // Cache the counts
    await this.followCacheService.cacheFollowCounts(
      userId,
      followerCount,
      followingCount
    );
    
    return { followerCount, followingCount };
  }
  
  /**
   * Refresh cached follow counts for a user
   */
  async refreshFollowCounts(userId: string): Promise<FollowCountDto> {
    const [followerCount, followingCount] = await Promise.all([
      this.followRepository.getFollowerCount(userId),
      this.followRepository.getFollowingCount(userId)
    ]);
    
    // Cache the counts
    await this.followCacheService.cacheFollowCounts(
      userId,
      followerCount,
      followingCount
    );
    
    return { followerCount, followingCount };
  }
  
  /**
   * Get follow suggestions for a user
   */
  async getFollowSuggestions(
    userId: string,
    queryDto: FollowSuggestionsQueryDto
  ): Promise<User[]> {
    const { 
      limit = 10, 
      includeMutual = true, 
      includePopular = true,
      includeSimilarInterests = true
    } = queryDto;
    
    // Get user's current follows
    const currentFollowing = await this.followRepository.find({
      where: { followerId: userId },
      select: ['followingId']
    });
    
    const followingIds = currentFollowing.map(f => f.followingId);
    
    // Also don't suggest users with pending follow requests
    const pendingRequests = await this.followRequestRepository.find({
      where: { requesterId: userId, status: FollowRequestStatus.PENDING },
      select: ['recipientId']
    });
    
    const pendingRequestIds = pendingRequests.map(r => r.recipientId);
    
    // Combine IDs we don't want to suggest
    const excludeIds = [userId, ...followingIds, ...pendingRequestIds];
    
    // Build a set of suggested user IDs
    const suggestedUserIds = new Set<string>();
    
    // Add mutual connection suggestions
    if (includeMutual && followingIds.length > 0) {
      // Get users that the user's followings are following
      const mutualFollows = await this.connection.createQueryBuilder()
        .select('f2.followingId')
        .from(Follow, 'f1')
        .innerJoin(Follow, 'f2', 'f1.followingId = f2.followerId')
        .where('f1.followerId = :userId', { userId })
        .andWhere('f2.followingId NOT IN (:...excludeIds)', { excludeIds })
        .limit(limit * 2) // Get more than needed as some might be duplicates
        .getRawMany();
      
      mutualFollows.forEach(f => suggestedUserIds.add(f.followingId));
    }
    
    // Add popular user suggestions
    if (includePopular && suggestedUserIds.size < limit) {
      // Find popular users based on follower count
      const popularUsers = await this.connection.createQueryBuilder()
        .select('f.followingId')
        .from(Follow, 'f')
        .where('f.followingId NOT IN (:...excludeIds)', { 
          excludeIds: [...excludeIds, ...Array.from(suggestedUserIds)]
        })
        .groupBy('f.followingId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(limit - suggestedUserIds.size)
        .getRawMany();
      
      popularUsers.forEach(u => suggestedUserIds.add(u.followingId));
    }
    
    // Add similar interest suggestions
    if (includeSimilarInterests && suggestedUserIds.size < limit) {
      // This would require user interests to be modeled
      // For this example, we'll simulate with a simplified approach
      // In a real app, this would pull from user interests, topics, etc.
      
      // Find users with similar followers
      const similarUsers = await this.connection.createQueryBuilder()
        .select('f2.followerId')
        .from(Follow, 'f1')
        .innerJoin(Follow, 'f2', 'f1.followingId = f2.followingId')
        .where('f1.followerId = :userId', { userId })
        .andWhere('f2.followerId NOT IN (:...excludeIds)', { 
          excludeIds: [...excludeIds, ...Array.from(suggestedUserIds)]
        })
        .groupBy('f2.followerId')
        .orderBy('COUNT(*)', 'DESC')
        .limit(limit - suggestedUserIds.size)
        .getRawMany();
      
      similarUsers.forEach(u => suggestedUserIds.add(u.followerId));
    }
    
    // If we still don't have enough, get random users
    if (suggestedUserIds.size < limit) {
      const neededCount = limit - suggestedUserIds.size;
      
      const randomUsers = await this.connection.createQueryBuilder()
        .select('u.id')
        .from(User, 'u')
        .where('u.id NOT IN (:...excludeIds)', { 
          excludeIds: [...excludeIds, ...Array.from(suggestedUserIds)]
        })
        .orderBy('RANDOM()') // Note: DB specific, works in PostgreSQL
        .limit(neededCount)
        .getRawMany();
      
      randomUsers.forEach(u => suggestedUserIds.add(u.id));
    }
    
    // Fetch full user objects
    const suggestedUsers = await this.userService.findByIds(
      Array.from(suggestedUserIds)
    );
    
    return suggestedUsers;
  }
}
