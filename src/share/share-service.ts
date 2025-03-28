// src/shares/share.service.ts

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Share } from './entities/share.entity';
import { ShareDto, CreateShareDto, ShareFilterDto, ShareAnalyticsDto } from './dto/share.dto';
import { ContentService } from '../content/content.service';
import { UserService } from '../users/user.service';
import { NotificationService } from '../notifications/notification.service';
import { SharePlatform, ShareVisibility, ShareEvents } from './share.constants';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { PreviewGeneratorService } from '../common/services/preview-generator.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ShareService {
  private readonly logger = new Logger(ShareService.name);

  constructor(
    @InjectRepository(Share)
    private shareRepository: Repository<Share>,
    private readonly contentService: ContentService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly previewGeneratorService: PreviewGeneratorService,
    private readonly analyticsService: AnalyticsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new share for content
   */
  async createShare(userId: string, createShareDto: CreateShareDto): Promise<ShareDto> {
    // Apply rate limiting for share operations
    await this.rateLimiterService.checkRateLimit(`share:create:${userId}`, 10, 60); // 10 shares per minute

    // Verify content exists
    const content = await this.contentService.findById(createShareDto.contentId);
    if (!content) {
      throw new NotFoundException(`Content with ID ${createShareDto.contentId} not found`);
    }

    // Verify user has permission to share this content
    const canShare = await this.contentService.canUserShareContent(userId, content.id);
    if (!canShare) {
      throw new BadRequestException('You do not have permission to share this content');
    }

    // Generate preview for the content if needed
    let previewUrl = null;
    if (createShareDto.generatePreview) {
      previewUrl = await this.previewGeneratorService.generatePreview(content);
    }

    // Create share entity
    const share = this.shareRepository.create({
      contentId: content.id,
      userId,
      platform: createShareDto.platform || SharePlatform.INTERNAL,
      visibility: createShareDto.visibility || ShareVisibility.PUBLIC,
      expiresAt: createShareDto.expiresAt,
      previewUrl,
      title: createShareDto.title || content.title,
      description: createShareDto.description || content.description,
      shareLink: null, // Will be generated after saving
    });

    // Save share entity
    const savedShare = await this.shareRepository.save(share);

    // Generate platform-specific share link
    savedShare.shareLink = await this.generateShareLink(savedShare);
    await this.shareRepository.save(savedShare);

    // Track share creation in analytics
    this.analyticsService.trackEvent('share_created', {
      shareId: savedShare.id,
      userId,
      contentId: content.id,
      platform: savedShare.platform,
    });

    // Emit share created event
    this.eventEmitter.emit(ShareEvents.CREATED, savedShare);

    // Send notification to content owner if different from sharer
    if (content.userId !== userId) {
      await this.notificationService.createNotification({
        userId: content.userId,
        type: 'CONTENT_SHARED',
        referenceId: savedShare.id,
        message: `Your content "${content.title}" was shared by a user`,
      });
    }

    return this.mapToDto(savedShare);
  }

  /**
   * Generate platform-specific share links
   */
  private async generateShareLink(share: Share): Promise<string> {
    const baseUrl = process.env.APP_URL || 'https://app.example.com';
    const shareToken = await this.generateUniqueShareToken();

    switch (share.platform) {
      case SharePlatform.INTERNAL:
        return `${baseUrl}/shared/${shareToken}`;
      
      case SharePlatform.TWITTER:
        return `https://twitter.com/intent/tweet?url=${encodeURIComponent(`${baseUrl}/shared/${shareToken}`)}&text=${encodeURIComponent(share.title)}`;
      
      case SharePlatform.FACEBOOK:
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${baseUrl}/shared/${shareToken}`)}`;
      
      case SharePlatform.LINKEDIN:
        return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${baseUrl}/shared/${shareToken}`)}&title=${encodeURIComponent(share.title)}`;
      
      case SharePlatform.EMAIL:
        return `mailto:?subject=${encodeURIComponent(share.title)}&body=${encodeURIComponent(`${share.description}\n\n${baseUrl}/shared/${shareToken}`)}`;
      
      default:
        return `${baseUrl}/shared/${shareToken}`;
    }
  }

  /**
   * Generate HTML/iframe embed code for content
   */
  async generateEmbedCode(shareId: string): Promise<string> {
    const share = await this.findById(shareId);
    
    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found`);
    }

    const baseUrl = process.env.APP_URL || 'https://app.example.com';
    return `<iframe src="${baseUrl}/embed/${share.id}" width="100%" height="400" frameborder="0"></iframe>`;
  }

  /**
   * Find share by ID
   */
  async findById(id: string): Promise<Share> {
    return this.shareRepository.findOne({ where: { id } });
  }

  /**
   * Get shared content with filtering options
   */
  async findSharedContent(filters: ShareFilterDto): Promise<ShareDto[]> {
    const query = this.shareRepository.createQueryBuilder('share');

    if (filters.userId) {
      query.andWhere('share.userId = :userId', { userId: filters.userId });
    }

    if (filters.contentId) {
      query.andWhere('share.contentId = :contentId', { contentId: filters.contentId });
    }

    if (filters.platform) {
      query.andWhere('share.platform = :platform', { platform: filters.platform });
    }

    if (filters.visibility) {
      query.andWhere('share.visibility = :visibility', { visibility: filters.visibility });
    }

    if (filters.fromDate) {
      query.andWhere('share.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      query.andWhere('share.createdAt <= :toDate', { toDate: filters.toDate });
    }

    // Pagination
    const take = filters.limit || 10;
    const skip = filters.offset || 0;
    query.take(take).skip(skip);

    // Order by
    query.orderBy('share.createdAt', 'DESC');

    const shares = await query.getMany();
    return shares.map(share => this.mapToDto(share));
  }

  /**
   * Get share analytics
   */
  async getShareAnalytics(shareId: string): Promise<ShareAnalyticsDto> {
    const share = await this.findById(shareId);
    
    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found`);
    }

    // Get analytics data from analytics service
    const viewCount = await this.analyticsService.getEventCount('share_view', { shareId });
    const clickCount = await this.analyticsService.getEventCount('share_click', { shareId });
    const uniqueViewers = await this.analyticsService.getUniqueUsers('share_view', { shareId });
    
    // Get geographic data
    const geoDistribution = await this.analyticsService.getGeographicDistribution('share_view', { shareId });
    
    // Get referrers
    const referrers = await this.analyticsService.getReferrers('share_view', { shareId });

    return {
      shareId,
      viewCount,
      clickCount,
      uniqueViewers,
      geoDistribution,
      referrers,
      conversionRate: clickCount > 0 ? (clickCount / viewCount) * 100 : 0,
    };
  }

  /**
   * Record share view
   */
  async recordShareView(shareId: string, viewerIp: string, referrer?: string): Promise<void> {
    const share = await this.findById(shareId);
    
    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found`);
    }

    // Track view in analytics
    this.analyticsService.trackEvent('share_view', {
      shareId,
      viewerIp,
      referrer,
      timestamp: new Date(),
    });

    // Emit share viewed event
    this.eventEmitter.emit(ShareEvents.VIEWED, { shareId, viewerIp, referrer });
  }

  /**
   * Get activity feed for shares
   */
  async getShareActivityFeed(userId: string, limit = 10, offset = 0): Promise<ShareDto[]> {
    // Get shares created by user
    const userShares = await this.shareRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Get shares of content created by user
    const user = await this.userService.findById(userId);
    const userContentIds = user.createdContent.map(content => content.id);
    
    const contentShares = await this.shareRepository.find({
      where: { contentId: { $in: userContentIds } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Combine and sort by date
    const allShares = [...userShares, ...contentShares]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return allShares.map(share => this.mapToDto(share));
  }

  /**
   * Delete a share
   */
  async deleteShare(userId: string, shareId: string): Promise<void> {
    const share = await this.findById(shareId);
    
    if (!share) {
      throw new NotFoundException(`Share with ID ${shareId} not found`);
    }

    if (share.userId !== userId) {
      throw new BadRequestException('You do not have permission to delete this share');
    }

    await this.shareRepository.remove(share);
    
    // Emit share deleted event
    this.eventEmitter.emit(ShareEvents.DELETED, { shareId, userId });
  }

  /**
   * Helper method to generate a unique share token
   */
  private async generateUniqueShareToken(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token;
    let isUnique = false;

    while (!isUnique) {
      token = '';
      for (let i = 0; i < 10; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if token is unique
      const existingShare = await this.shareRepository.findOne({ where: { shareLink: { $regex: token } } });
      isUnique = !existingShare;
    }

    return token;
  }

  /**
   * Map entity to DTO
   */
  private mapToDto(share: Share): ShareDto {
    return {
      id: share.id,
      contentId: share.contentId,
      userId: share.userId,
      platform: share.platform,
      visibility: share.visibility,
      shareLink: share.shareLink,
      previewUrl: share.previewUrl,
      title: share.title,
      description: share.description,
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    };
  }
}
