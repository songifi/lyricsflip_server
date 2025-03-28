// src/comments/comment.service.ts

import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentReport } from './entities/comment-report.entity';
import { 
  CreateCommentDto, 
  UpdateCommentDto, 
  CommentFilterDto, 
  CommentResponseDto,
  CommentPaginatedResponseDto,
  ModerateCommentDto,
  ReportCommentDto,
  ResolveReportDto
} from './dto/comment.dto';
import { 
  CommentStatus, 
  CommentSortOrder, 
  CommentEvents,
  ReportStatus 
} from './comment.constants';
import { ContentService } from '../content/content.service';
import { UserService } from '../users/user.service';
import { NotificationService } from '../notifications/notification.service';
import { ModerationService } from '../moderation/moderation.service';
import { User } from '../users/entities/user.entity';
import { RateLimiterService } from '../common/services/rate-limiter.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);
  private readonly MAX_DEPTH = 5; // Maximum depth for nested comments

  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(CommentReport)
    private commentReportRepository: Repository<CommentReport>,
    private dataSource: DataSource,
    private contentService: ContentService,
    private userService: UserService,
    private notificationService: NotificationService,
    private moderationService: ModerationService,
    private rateLimiterService: RateLimiterService,
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * Create a new comment or reply
   */
  async createComment(userId: string, createCommentDto: CreateCommentDto): Promise<CommentResponseDto> {
    // Apply rate limiting
    await this.rateLimiterService.checkRateLimit(`comment:create:${userId}`, 20, 60); // 20 comments per minute

    // Use a transaction to ensure data integrity
    return this.dataSource.transaction(async (manager) => {
      // Verify content exists
      const contentExists = await this.contentService.exists(createCommentDto.contentId);
      if (!contentExists) {
        throw new NotFoundException(`Content with ID ${createCommentDto.contentId} not found`);
      }

      // Get user
      const user = await this.userService.findById(userId);

      // Handle parent comment for replies
      let parentComment: Comment = null;
      let depth = 0;
      let path = '';

      if (createCommentDto.parentId) {
        parentComment = await manager.findOne(Comment, {
          where: { id: createCommentDto.parentId }
        });

        if (!parentComment) {
          throw new NotFoundException(`Parent comment with ID ${createCommentDto.parentId} not found`);
        }

        // Make sure parent comment belongs to the same content
        if (parentComment.contentId !== createCommentDto.contentId) {
          throw new BadRequestException('Parent comment does not belong to the specified content');
        }

        // Check depth limit to prevent deeply nested comments
        if (parentComment.depth >= this.MAX_DEPTH) {
          throw new BadRequestException(`Comments can only be nested up to ${this.MAX_DEPTH} levels deep`);
        }

        depth = parentComment.depth + 1;
      }

      // Check text for moderation before saving
      const textModeration = await this.moderationService.moderateText(createCommentDto.text);
      const initialStatus = textModeration.flagged 
        ? CommentStatus.FLAGGED 
        : (user.isVerified ? CommentStatus.APPROVED : CommentStatus.PENDING);

      // Create comment entity
      const comment = manager.create(Comment, {
        contentId: createCommentDto.contentId,
        userId,
        text: createCommentDto.text,
        status: initialStatus,
        parentId: createCommentDto.parentId,
        depth
      });

      // Save the comment first to get an ID
      const savedComment = await manager.save(comment);

      // Update path for hierarchical queries
      path = parentComment 
        ? `${parentComment.path}.${savedComment.id}` 
        : savedComment.id;
      
      savedComment.path = path;
      await manager.save(savedComment);

      // Increment reply count on parent comment
      if (parentComment) {
        await manager.increment(
          Comment,
          { id: parentComment.id },
          'repliesCount',
          1
        );
      }

      // Create notification for comment
      if (parentComment) {
        // Notify the parent comment author about the reply
        if (parentComment.userId !== userId) {
          await this.notificationService.createNotification({
            userId: parentComment.userId,
            type: 'COMMENT_REPLY',
            referenceId: savedComment.id,
            message: `${user.username} replied to your comment`
          });
        }
      } else {
        // Notify content owner about the new comment
        const contentAuthorId = await this.contentService.getAuthorId(createCommentDto.contentId);
        if (contentAuthorId && contentAuthorId !== userId) {
          await this.notificationService.createNotification({
            userId: contentAuthorId,
            type: 'NEW_COMMENT',
            referenceId: savedComment.id,
            message: `${user.username} commented on your content`
          });
        }
      }

      // Emit event
      this.eventEmitter.emit(CommentEvents.CREATED, {
        commentId: savedComment.id,
        userId,
        contentId: createCommentDto.contentId,
        parentId: createCommentDto.parentId
      });

      // Return formatted response
      return this.mapToResponseDto(savedComment, user);
    });
  }

  /**
   * Get comments with filtering and pagination
   */
  async getComments(
    filters: CommentFilterDto, 
    currentUserId?: string
  ): Promise<CommentPaginatedResponseDto> {
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;

    // Build base query
    let queryBuilder = this.commentRepository.createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user');
    
    // Apply content filter
    if (filters.contentId) {
      queryBuilder = queryBuilder.andWhere('comment.contentId = :contentId', { 
        contentId: filters.contentId 
      });
    }

    // Apply user filter
    if (filters.userId) {
      queryBuilder = queryBuilder.andWhere('comment.userId = :userId', { 
        userId: filters.userId 
      });
    }

    // Filter by comment status
    // If current user is the comment author, show their own comments regardless of status
    if (filters.status) {
      if (currentUserId && filters.userId === currentUserId) {
        // For own comments, show regardless of status
        queryBuilder = queryBuilder.andWhere(
          '(comment.status = :status OR comment.userId = :currentUserId)', 
          { status: filters.status, currentUserId }
        );
      } else {
        // For other users, respect the status filter
        queryBuilder = queryBuilder.andWhere('comment.status = :status', { 
          status: filters.status 
        });
      }
    } else {
      // Default to showing only approved comments for other users
      if (currentUserId && filters.userId === currentUserId) {
        // For own comments, show all statuses
      } else {
        queryBuilder = queryBuilder.andWhere('comment.status = :status', { 
          status: CommentStatus.APPROVED 
        });
      }
    }

    // Handle parent/child comments
    if (filters.parentOnly === true) {
      queryBuilder = queryBuilder.andWhere('comment.parentId IS NULL');
    } else if (filters.parentId) {
      queryBuilder = queryBuilder.andWhere('comment.parentId = :parentId', {
        parentId: filters.parentId
      });
    }

    // Apply sorting
    switch (filters.sortOrder) {
      case CommentSortOrder.OLDEST:
        queryBuilder = queryBuilder.orderBy('comment.createdAt', 'ASC');
        break;
      case CommentSortOrder.MOST_LIKED:
        queryBuilder = queryBuilder.orderBy('comment.likesCount', 'DESC');
        break;
      case CommentSortOrder.MOST_REPLIES:
        queryBuilder = queryBuilder.orderBy('comment.repliesCount', 'DESC');
        break;
      case CommentSortOrder.NEWEST:
      default:
        queryBuilder = queryBuilder.orderBy('comment.createdAt', 'DESC');
        break;
    }

    // Get total count
    const total = await queryBuilder.getCount();
    
    // Apply pagination
    queryBuilder = queryBuilder
      .take(limit)
      .skip(offset);
    
    // Execute query
    const comments = await queryBuilder.getMany();

    // Check if the current user has liked any of these comments
    const commentIds = comments.map(comment => comment.id);
    let userLikes: Record<string, boolean> = {};
    
    if (currentUserId && commentIds.length > 0) {
      const likes = await this.commentLikeRepository.find({
        where: {
          commentId: { $in: commentIds },
          userId: currentUserId
        }
      });
      
      userLikes = likes.reduce((acc, like) => {
        acc[like.commentId] = true;
        return acc;
      }, {});
    }

    // Format response
    const responseData = await Promise.all(comments.map(async (comment) => {
      const isLiked = !!userLikes[comment.id];
      return this.mapToResponseDto(comment, comment.user, isLiked);
    }));

    // Load replies for parent comments if parent-only filter is applied
    if (filters.parentOnly === true) {
      for (const comment of responseData) {
        if (comment.repliesCount > 0) {
          const repliesFilter: CommentFilterDto = {
            parentId: comment.id,
            limit: 3, // Show only first few replies
            sortOrder: CommentSortOrder.OLDEST // Show oldest first for replies
          };
          
          const replies = await this.getComments(repliesFilter, currentUserId);
          comment.replies = replies.data;
        }
      }
    }

    return {
      data: responseData,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: total > offset + limit
    };
  }

  /**
   * Get a single comment by ID
   */
  async getCommentById(
    id: string, 
    currentUserId?: string
  ): Promise<CommentResponseDto> {
    const comment = await this.commentRepository.findOne({
      where: { id },
      relations: ['user']
    });
    
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    let isLiked = false;
    if (currentUserId) {
      const like = await this.commentLikeRepository.findOne({
        where: {
          commentId: id,
          userId: currentUserId
        }
      });
      isLiked = !!like;
    }

    return this.mapToResponseDto(comment, comment.user, isLiked);
  }

  /**
   * Update a comment
   */
  async updateComment(
    id: string, 
    userId: string, 
    updateCommentDto: UpdateCommentDto
  ): Promise<CommentResponseDto> {
    // Apply rate limiting
    await this.rateLimiterService.checkRateLimit(`comment:update:${userId}`, 10, 60); // 10 updates per minute

    return this.dataSource.transaction(async (manager) => {
      const comment = await manager.findOne(Comment, {
        where: { id },
        relations: ['user']
      });
      
      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }
      
      // Verify ownership
      if (comment.userId !== userId) {
        throw new ForbiddenException('You can only edit your own comments');
      }
      
      // Check if comment has been deleted (soft delete)
      if (comment.deletedAt) {
        throw new BadRequestException('Cannot update a deleted comment');
      }

      // Check text for moderation before saving
      const textModeration = await this.moderationService.moderateText(updateCommentDto.text);
      if (textModeration.flagged) {
        comment.status = CommentStatus.FLAGGED;
      }

      // Update comment
      comment.text = updateCommentDto.text;
      comment.isEdited = true;
      comment.editedAt = new Date();
      
      const updatedComment = await manager.save(comment);
      
      // Emit event
      this.eventEmitter.emit(CommentEvents.UPDATED, {
        commentId: updatedComment.id,
        userId,
        contentId: comment.contentId
      });
      
      return this.mapToResponseDto(updatedComment, comment.user);
    });
  }

  /**
   * Delete a comment
   */
  async deleteComment(id: string, userId: string, isModerator = false): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const comment = await manager.findOne(Comment, {
        where: { id }
      });
      
      if (!comment) {
        throw new NotFoundException(`Comment with ID ${id} not found`);
      }
      
      // Verify ownership unless moderator
      if (!isModerator && comment.userId !== userId) {
        throw new ForbiddenException('You can only delete your own comments');
      }
      
      // Soft delete the comment
      await manager.softDelete(Comment, id);
      
      // If this is a parent comment, soft delete all replies
      if (comment.repliesCount > 0) {
        await manager.softDelete(Comment, {
          path: { $like: `${comment.path}.%` }
        });
      }
      
      // If this is a reply, decrement parent's reply count
      if (comment.parentId) {
        await manager.decrement(
          Comment,
          { id: comment.parentId },
          'repliesCount',
          1
        );
      }
      
      // Emit event
      this.eventEmitter.emit(CommentEvents.DELETED, {
        commentId: id,
        userId,
        contentId: comment.contentId,
        moderatorAction: isModerator
      });
    });
  }

  /**
   * Like or unlike a comment
   */
  async toggleLike(commentId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    // Apply rate limiting
    await this.rateLimiterService.checkRateLimit(`comment:like:${userId}`, 30, 60); // 30 likes per minute

    return this.dataSource.transaction(async (manager) => {
      const comment = await manager.findOne(Comment, {
        where: { id: commentId }
      });
      
      if (!comment) {
        throw new NotFoundException(`Comment with