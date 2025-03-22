// src/privacy/privacy.service.ts

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

import { PrivacySettings, ProfileVisibility, ContentVisibility, FollowApprovalMode } from './entities/privacy-settings.entity';
import { FollowRequest, FollowRequestStatus } from './entities/follow-request.entity';
import { User } from '../user/entities/user.entity';
import { UpdatePrivacySettingsDto } from './dto/update-privacy-settings.dto';
import { ApplyPrivacyTemplateDto } from './dto/privacy-template.dto';

@Injectable()
export class PrivacyService {
  // Cache TTL in seconds (5 minutes)
  private readonly CACHE_TTL = 300;

  // Privacy setting templates
  private readonly PRIVACY_TEMPLATES = {
    public: {
      profileVisibility: ProfileVisibility.PUBLIC,
      postVisibility: ContentVisibility.PUBLIC,
      messageVisibility: ContentVisibility.PUBLIC,
      followApprovalMode: FollowApprovalMode.AUTOMATIC,
      showOnlineStatus: true,
      showLastSeen: true,
      allowTagging: true,
      allowMentions: true,
      showInSearchResults: true,
      allowDirectMessages: true,
      blockScreenshots: false,
    },
    private: {
      profileVisibility: ProfileVisibility.PRIVATE,
      postVisibility: ContentVisibility.FOLLOWERS_ONLY,
      messageVisibility: ContentVisibility.FOLLOWERS_ONLY,
      followApprovalMode: FollowApprovalMode.MANUAL,
      showOnlineStatus: false,
      showLastSeen: false,
      allowTagging: false,
      allowMentions: true,
      showInSearchResults: false,
      allowDirectMessages: false,
      blockScreenshots: true,
    },
    balanced: {
      profileVisibility: ProfileVisibility.PUBLIC,
      postVisibility: ContentVisibility.FOLLOWERS_ONLY,
      messageVisibility: ContentVisibility.FRIENDS_ONLY,
      followApprovalMode: FollowApprovalMode.AUTOMATIC,
      showOnlineStatus: true,
      showLastSeen: false,
      allowTagging: true,
      allowMentions: true,
      showInSearchResults: true,
      allowDirectMessages: true,
      blockScreenshots: false,
    },
    custom: {} // Empty template for custom settings
  };

  constructor(
    @InjectRepository(PrivacySettings)
    private privacySettingsRepository: Repository<PrivacySettings>,
    @InjectRepository(FollowRequest)
    private followRequestRepository: Repository<FollowRequest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  // ===== PRIVACY SETTINGS MANAGEMENT =====

  /**
   * Get privacy settings for a user, creating default settings if none exist
   */
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    // Try to get from cache first
    const cacheKey = `privacy_settings:${userId}`;
    const cachedSettings = await this.cacheManager.get<PrivacySettings>(cacheKey);
    
    if (cachedSettings) {
      return cachedSettings;
    }

    let settings = await this.privacySettingsRepository.findOne({
      where: { user: { id: userId } }
    });

    if (!settings) {
      // Create default settings if not exist
      settings = await this.createDefaultPrivacySettings(userId);
    }

    // Cache the settings
    await this.cacheManager.set(cacheKey, settings, this.CACHE_TTL);
    
    return settings;
  }

  /**
   * Create default privacy settings for a new user
   */
  async createDefaultPrivacySettings(userId: string): Promise<PrivacySettings> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const defaultSettings = this.privacySettingsRepository.create({
      user,
      // Default to the "balanced" template
      ...this.PRIVACY_TEMPLATES.balanced
    });

    const savedSettings = await this.privacySettingsRepository.save(defaultSettings);
    
    // Emit event for new privacy settings created
    this.eventEmitter.emit('privacy.settings.created', {
      userId,
      settings: savedSettings
    });

    return savedSettings;
  }

  /**
   * Update a user's privacy settings
   */
  async updatePrivacySettings(
    userId: string, 
    updateDto: UpdatePrivacySettingsDto
  ): Promise<PrivacySettings> {
    const settings = await this.privacySettingsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user']
    });

    if (!settings) {
      throw new NotFoundException('Privacy settings not found');
    }

    // Update the settings
    const updatedSettings = Object.assign(settings, updateDto);
    const savedSettings = await this.privacySettingsRepository.save(updatedSettings);

    // Clear cache
    const cacheKey = `privacy_settings:${userId}`;
    await this.cacheManager.del(cacheKey);

    // Emit event for privacy settings updated
    this.eventEmitter.emit('privacy.settings.updated', {
      userId,
      settings: savedSettings,
      changes: updateDto
    });

    return savedSettings;
  }

  /**
   * Apply a predefined privacy template to a user's settings
   */
  async applyPrivacyTemplate(
    userId: string, 
    templateDto: ApplyPrivacyTemplateDto
  ): Promise<PrivacySettings> {
    const { templateName } = templateDto;
    
    // Check if template exists
    if (!this.PRIVACY_TEMPLATES[templateName]) {
      throw new BadRequestException(`Template "${templateName}" does not exist`);
    }

    const settings = await this.privacySettingsRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user']
    });

    if (!settings) {
      throw new NotFoundException('Privacy settings not found');
    }

    // Apply the template
    const template = this.PRIVACY_TEMPLATES[templateName];
    const updatedSettings = Object.assign(settings, template);
    const savedSettings = await this.privacySettingsRepository.save(updatedSettings);

    // Clear cache
    const cacheKey = `privacy_settings:${userId}`;
    await this.cacheManager.del(cacheKey);

    // Emit event for privacy template applied
    this.eventEmitter.emit('privacy.template.applied', {
      userId,
      templateName,
      settings: savedSettings
    });

    return savedSettings;
  }

  /**
   * Get all available privacy templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(this.PRIVACY_TEMPLATES);
  }

  // ===== VISIBILITY RULE ENFORCEMENT =====

  /**
   * Check if a user can view another user's profile
   */
  async canViewProfile(viewerId: string | null, profileUserId: string): Promise<boolean> {
    // Users can always view their own profile
    if (viewerId === profileUserId) {
      return true;
    }

    const settings = await this.getPrivacySettings(profileUserId);

    // Public profiles are visible to everyone
    if (settings.profileVisibility === ProfileVisibility.PUBLIC) {
      return true;
    }

    // Anonymous users can only see public profiles
    if (!viewerId) {
      return false;
    }

    // For FOLLOWERS_ONLY or PRIVATE, check if viewer follows the profile user
    if (settings.profileVisibility === ProfileVisibility.FOLLOWERS_ONLY) {
      return await this.isFollowing(viewerId, profileUserId);
    }

    // PRIVATE profiles are only visible to the user themselves
    return false;
  }

  /**
   * Check if a user can view another user's content (posts, etc.)
   */
  async canViewContent(
    viewerId: string | null, 
    creatorId: string, 
    contentType: 'post' | 'message' = 'post'
  ): Promise<boolean> {
    // Users can always view their own content
    if (viewerId === creatorId) {
      return true;
    }

    const settings = await this.getPrivacySettings(creatorId);
    
    // Determine which visibility setting to check
    const visibilitySetting = 
      contentType === 'post' ? settings.postVisibility : settings.messageVisibility;

    // PUBLIC content is visible to everyone
    if (visibilitySetting === ContentVisibility.PUBLIC) {
      return true;
    }

    // Anonymous users can only see public content
    if (!viewerId) {
      return false;
    }

    // FOLLOWERS_ONLY content is visible to followers
    if (visibilitySetting === ContentVisibility.FOLLOWERS_ONLY) {
      return await this.isFollowing(viewerId, creatorId);
    }

    // FRIENDS_ONLY content is visible to mutual followers
    if (visibilitySetting === ContentVisibility.FRIENDS_ONLY) {
      return await this.areMutualFollowers(viewerId, creatorId);
    }

    // PRIVATE content is only visible to the creator
    return false;
  }

  /**
   * Check if a user can send direct messages to another user
   */
  async canSendDirectMessage(senderId: string, recipientId: string): Promise<boolean> {
    const settings = await this.getPrivacySettings(recipientId);

    // If DMs are disabled, no one can send messages
    if (!settings.allowDirectMessages) {
      return false;
    }

    // Check visibility based on message visibility setting
    if (settings.messageVisibility === ContentVisibility.PUBLIC) {
      return true;
    }

    if (settings.messageVisibility === ContentVisibility.FOLLOWERS_ONLY) {
      return await this.isFollowing(senderId, recipientId);
    }

    if (settings.messageVisibility === ContentVisibility.FRIENDS_ONLY) {
      return await this.areMutualFollowers(senderId, recipientId);
    }

    // PRIVATE means only mutual followers who are explicitly allowed
    return false;
  }

  /**
   * Check if a user can tag another user
   */
  async canTagUser(taggerId: string, targetId: string): Promise<boolean> {
    const settings = await this.getPrivacySettings(targetId);

    // If tagging is disabled, no one can tag
    if (!settings.allowTagging) {
      return false;
    }

    // For other cases, follow the same rules as message visibility
    return this.canSendDirectMessage(taggerId, targetId);
  }

  /**
   * Check if a user can mention another user
   */
  async canMentionUser(mentionerId: string, targetId: string): Promise<boolean> {
    const settings = await this.getPrivacySettings(targetId);

    // If mentions are disabled, no one can mention
    if (!settings.allowMentions) {
      return false;
    }

    // For other cases, follow the same rules as message visibility
    return this.canSendDirectMessage(mentionerId, targetId);
  }

  // ===== FOLLOW REQUEST WORKFLOW =====

  /**
   * Create a follow request from one user to another
   */
  async createFollowRequest(requesterId: string, targetId: string): Promise<FollowRequest> {
    // Users can't follow themselves
    if (requesterId === targetId) {
      throw new BadRequestException("You cannot follow yourself");
    }

    // Check if users exist
    const requester = await this.userRepository.findOne({ where: { id: requesterId } });
    const target = await this.userRepository.findOne({ where: { id: targetId } });

    if (!requester || !target) {
      throw new NotFoundException('User not found');
    }

    // Check if already following
    const isAlreadyFollowing = await this.isFollowing(requesterId, targetId);
    if (isAlreadyFollowing) {
      throw new BadRequestException('You are already following this user');
    }

    // Check if there's a pending request
    const existingRequest = await this.followRequestRepository.findOne({
      where: {
        requester: { id: requesterId },
        target: { id: targetId },
        status: FollowRequestStatus.PENDING
      }
    });

    if (existingRequest) {
      throw new BadRequestException('You already have a pending follow request for this user');
    }

    // Get target's privacy settings
    const targetSettings = await this.getPrivacySettings(targetId);

    // Create a new follow request
    const followRequest = this.followRequestRepository.create({
      requester,
      target,
      status: FollowRequestStatus.PENDING
    });

    const savedRequest = await this.followRequestRepository.save(followRequest);

    // If automatic approval is enabled, approve immediately
    if (targetSettings.followApprovalMode === FollowApprovalMode.AUTOMATIC) {
      await this.approveFollowRequest(targetId, savedRequest.id);
    } else {
      // Otherwise, emit event for pending follow request
      this.eventEmitter.emit('follow.request.created', {
        requestId: savedRequest.id,
        requesterId,
        targetId
      });
    }

    return savedRequest;
  }

  /**
   * Get all pending follow requests for a user
   */
  async getPendingFollowRequests(userId: string): Promise<FollowRequest[]> {
    return this.followRequestRepository.find({
      where: {
        target: { id: userId },
        status: FollowRequestStatus.PENDING
      },
      relations: ['requester']
    });
  }

  /**
   * Approve a follow request
   */
  async approveFollowRequest(userId: string, requestId: string): Promise<FollowRequest> {
    const request = await this.followRequestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'target']
    });

    if (!request) {
      throw new NotFoundException('Follow request not found');
    }

    // Ensure the user is the target of the request
    if (request.target.id !== userId) {
      throw new ForbiddenException('You can only approve follow requests sent to you');
    }

    // Update the request status
    request.status = FollowRequestStatus.APPROVED;
    const updatedRequest = await this.followRequestRepository.save(request);

    // Create the actual follow relationship
    // Assuming you have a FollowService or similar that handles this
    // await this.followService.createFollow(request.requester.id, request.target.id);

    // Emit follow request approved event
    this.eventEmitter.emit('follow.request.approved', {
      requestId,
      requesterId: request.requester.id,
      targetId: request.target.id
    });

    return updatedRequest;
  }

  /**
   * Reject a follow request
   */
  async rejectFollowRequest(userId: string, requestId: string): Promise<FollowRequest> {
    const request = await this.followRequestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'target']
    });

    if (!request) {
      throw new NotFoundException('Follow request not found');
    }

    // Ensure the user is the target of the request
    if (request.target.id !== userId) {
      throw new ForbiddenException('You can only reject follow requests sent to you');
    }

    // Update the request status
    request.status = FollowRequestStatus.REJECTED;
    const updatedRequest = await this.followRequestRepository.save(request);

    // Emit follow request rejected event
    this.eventEmitter.emit('follow.request.rejected', {
      requestId,
      requesterId: request.requester.id,
      targetId: request.target.id
    });

    return updatedRequest;
  }

  // ===== CONTENT FILTERING =====

  /**
   * Apply privacy filters to a post query
   * This method modifies the query to only return posts that the viewer is allowed to see
   */
  applyPostPrivacyFilters(
    query: SelectQueryBuilder<any>, 
    viewerId: string | null
  ): SelectQueryBuilder<any> {
    // Anonymous users can only see public posts
    if (!viewerId) {
      return query.andWhere('post.visibility = :visibility', { 
        visibility: ContentVisibility.PUBLIC 
      });
    }

    // Start with a condition that will always let users see their own posts
    query.andWhere(`(post.authorId = :viewerId OR (
      CASE 
        WHEN post.visibility = '${ContentVisibility.PUBLIC}' THEN true
        WHEN post.visibility = '${ContentVisibility.FOLLOWERS_ONLY}' THEN 
          EXISTS (SELECT 1 FROM follows WHERE follows.followerId = :viewerId AND follows.followingId = post.authorId)
        WHEN post.visibility = '${ContentVisibility.FRIENDS_ONLY}' THEN 
          EXISTS (SELECT 1 FROM follows f1 WHERE f1.followerId = :viewerId AND f1.followingId = post.authorId) AND
          EXISTS (SELECT 1 FROM follows f2 WHERE f2.followerId = post.authorId AND f2.followingId = :viewerId)
        ELSE false
      END))`, 
      { viewerId }
    );

    return query;
  }

  /**
   * Apply privacy filters to a user search query
   * This method modifies the query to only return users that should appear in search results
   */
  applyUserSearchPrivacyFilters(
    query: SelectQueryBuilder<any>
  ): SelectQueryBuilder<any> {
    // Only include users who allow being shown in search results
    return query
      .leftJoin('user.privacySettings', 'privacySettings')
      .andWhere('privacySettings.showInSearchResults = :showInSearch', { showInSearch: true });
  }

  /**
   * Apply privacy filters to a profile query
   * This method modifies the query to only return profiles the viewer is allowed to see
   */
  applyProfilePrivacyFilters(
    query: SelectQueryBuilder<any>,
    viewerId: string | null
  ): SelectQueryBuilder<any> {
    // Start with public profiles for anonymous users
    if (!viewerId) {
      return query
        .leftJoin('user.privacySettings', 'privacySettings')
        .andWhere('privacySettings.profileVisibility = :visibility', { 
          visibility: ProfileVisibility.PUBLIC 
        });
    }

    // For authenticated users, include their own profile, public profiles, 
    // and profiles they're following if the visibility permits
    query
      .leftJoin('user.privacySettings', 'privacySettings')
      .andWhere(`(user.id = :viewerId OR (
        CASE 
          WHEN privacySettings.profileVisibility = '${ProfileVisibility.PUBLIC}' THEN true
          WHEN privacySettings.profileVisibility = '${ProfileVisibility.FOLLOWERS_ONLY}' THEN 
            EXISTS (SELECT 1 FROM follows WHERE follows.followerId = :viewerId AND follows.followingId = user.id)
          ELSE false
        END))`, 
        { viewerId }
      );

    return query;
  }

  // ===== HELPER METHODS =====

  /**
   * Check if a user is following another user
   */
  private async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    // Mock implementation - replace with actual implementation from your follow service
    // This would typically query a follows table or similar
    return true; // For simplicity in this example
  }

  /**
   * Check if two users are mutual followers (friends)
   */
  private async areMutualFollowers(userId1: string, userId2: string): Promise<boolean> {
    const isUser1FollowingUser2 = await this.isFollowing(userId1, userId2);
    const isUser2FollowingUser1 = await this.isFollowing(userId2, userId1);
    
    return isUser1FollowingUser2 && isUser2FollowingUser1;
  }
}
