// ==== Core Service Implementation ====

// like/like.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER, Inject } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { Like } from './entities/like.entity';
import { User } from '../users/entities/user.entity';
import { ContentType } from './enums/content-type.enum';
import { LikeEvent } from './events/like.event';
import { PaginationDto } from '../common/dto/pagination.dto';
import { NotificationService } from '../notification/notification.service';
import { LikeDto } from './dto/like.dto';
import { AuthorizationService } from '../authorization/authorization.service';

@Injectable()
export class LikeService {
  constructor(
    @InjectRepository(Like)
    private likeRepository: Repository<Like>,
    private connection: Connection,
    private eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private notificationService: NotificationService,
    private authorizationService: AuthorizationService,
  ) {}

  /**
   * Toggle a like (like/unlike) for a specific content
   * @param userId User performing the like/unlike action
   * @param contentType Type of content being liked
   * @param contentId Unique identifier of the content
   * @returns Boolean indicating if content is now liked (true) or unliked (false)
   */
  async toggleLike(userId: string, contentType: ContentType, contentId: string): Promise<boolean> {
    // Start a database transaction for data consistency
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if user has permission to like this content
      await this.authorizationService.checkPermission(userId, 'like', contentType, contentId);

      // Check if the like already exists
      const existingLike = await this.likeRepository.findOne({
        where: {
          userId,
          contentType,
          contentId,
        },
      });

      let isLiked: boolean;

      if (existingLike) {
        // Unlike: Remove the existing like
        await queryRunner.manager.remove(existingLike);
        isLiked = false;
        
        // Emit unlike event
        this.eventEmitter.emit('like.removed', new LikeEvent(userId, contentType, contentId));
      } else {
        // Like: Create a new like
        const newLike = this.likeRepository.create({
          userId,
          contentType,
          contentId,
          createdAt: new Date(),
        });
        
        await queryRunner.manager.save(newLike);
        isLiked = true;
        
        // Emit like event
        this.eventEmitter.emit('like.created', new LikeEvent(userId, contentType, contentId));
        
        // Create notification for content owner
        await this.notificationService.createLikeNotification(userId, contentType, contentId);
      }

      // Commit the transaction
      await queryRunner.commitTransaction();
      
      // Update cache for like count
      await this.updateLikeCountCache(contentType, contentId);
      
      return isLiked;
    } catch (error) {
      // Rollback the transaction in case of error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Check if a user has liked specific content
   * @param userId User to check
   * @param contentType Type of content
   * @param contentId Content identifier
   * @returns Boolean indicating if user has liked the content
   */
  async hasLiked(userId: string, contentType: ContentType, contentId: string): Promise<boolean> {
    const like = await this.likeRepository.findOne({
      where: {
        userId,
        contentType,
        contentId,
      },
    });
    
    return !!like;
  }

  /**
   * Get all content of a specific type that a user has liked
   * @param userId User whose likes to retrieve
   * @param contentType Type of content to filter by
   * @param paginationDto Pagination parameters
   * @returns Array of like data
   */
  async getLikedContent(
    userId: string,
    contentType: ContentType,
    paginationDto: PaginationDto,
  ): Promise<LikeDto[]> {
    const { page = 1, limit = 10 } = paginationDto;
    
    const likes = await this.likeRepository.find({
      where: {
        userId,
        contentType,
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return likes.map(like => ({
      id: like.id,
      userId: like.userId,
      contentType: like.contentType,
      contentId: like.contentId,
      createdAt: like.createdAt,
    }));
  }

  /**
   * Get total like count for specific content
   * Uses caching to optimize performance
   * @param contentType Type of content
   * @param contentId Content identifier
   * @returns Number of likes
   */
  async getLikeCount(contentType: ContentType, contentId: string): Promise<number> {
    // Try to get count from cache first
    const cacheKey = `like_count:${contentType}:${contentId}`;
    const cachedCount = await this.cacheManager.get<number>(cacheKey);
    
    if (cachedCount !== undefined) {
      return cachedCount;
    }
    
    // If not in cache, fetch from database
    const count = await this.likeRepository.count({
      where: {
        contentType,
        contentId,
      },
    });
    
    // Store in cache for future requests (5 minute TTL)
    await this.cacheManager.set(cacheKey, count, 300);
    
    return count;
  }

  /**
   * Get users who liked specific content with pagination
   * @param contentType Type of content
   * @param contentId Content identifier
   * @param paginationDto Pagination parameters
   * @returns Array of users who liked the content
   */
  async getLikeUsers(
    contentType: ContentType,
    contentId: string,
    paginationDto: PaginationDto,
  ): Promise<User[]> {
    const { page = 1, limit = 10 } = paginationDto;
    
    const likes = await this.likeRepository.find({
      where: {
        contentType,
        contentId,
      },
      relations: ['user'],
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return likes.map(like => like.user);
  }

  /**
   * Get feed of all liked content for a user with pagination
   * @param userId User whose liked content to retrieve
   * @param paginationDto Pagination parameters
   * @returns Array of liked content data
   */
  async getLikedContentFeed(
    userId: string,
    paginationDto: PaginationDto,
  ): Promise<LikeDto[]> {
    const { page = 1, limit = 10 } = paginationDto;
    
    const likes = await this.likeRepository.find({
      where: {
        userId,
      },
      order: {
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return likes.map(like => ({
      id: like.id,
      userId: like.userId,
      contentType: like.contentType,
      contentId: like.contentId,
      createdAt: like.createdAt,
    }));
  }

  /**
   * Private method to update like count in cache
   * @param contentType Type of content
   * @param contentId Content identifier
   */
  private async updateLikeCountCache(contentType: ContentType, contentId: string): Promise<void> {
    const count = await this.likeRepository.count({
      where: {
        contentType,
        contentId,
      },
    });
    
    const cacheKey = `like_count:${contentType}:${contentId}`;
    await this.cacheManager.set(cacheKey, count, 300); // Cache for 5 minutes
  }
}

// ==== Entity and DTO Models ====

// like/entities/like.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ContentType } from '../enums/content-type.enum';

@Entity('likes')
@Unique(['userId', 'contentType', 'contentId']) // Ensure a user can only like content once
@Index(['contentType', 'contentId']) // For efficient querying of likes for specific content
@Index(['userId', 'createdAt']) // For efficient querying of user's liked content
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ContentType,
    name: 'content_type',
  })
  contentType: ContentType;

  @Column({ name: 'content_id' })
  contentId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// like/enums/content-type.enum.ts
export enum ContentType {
  POST = 'post',
  COMMENT = 'comment',
  PHOTO = 'photo',
  VIDEO = 'video',
  STORY = 'story',
  // Add other content types as needed
}

// like/dto/like.dto.ts
import { IsEnum, IsUUID, IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { ContentType } from '../enums/content-type.enum';

export class LikeDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsUUID()
  userId: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNotEmpty()
  contentId: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;
}

export class ToggleLikeDto {
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNotEmpty()
  contentId: string;
}

// common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

// ==== Controller Implementation ====

// like/like.controller.ts
import { Controller, Post, Get, Body, Query, Param, UseGuards, Request, UseInterceptors } from '@nestjs/common';
import { RateLimit, RateLimiterInterceptor } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

import { LikeService } from './like.service';
import { ToggleLikeDto, LikeDto } from './dto/like.dto';
import { ContentType } from './enums/content-type.enum';
import { PaginationDto } from '../common/dto/pagination.dto';
import { User as UserEntity } from '../users/entities/user.entity';

@Controller('likes')
@UseGuards(AuthGuard('jwt'))
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  /**
   * Toggle like/unlike for a piece of content
   * Rate limited to prevent abuse
   */
  @Post('toggle')
  @UseInterceptors(RateLimiterInterceptor)
  @RateLimit({ points: 10, duration: 60 }) // Limit to 10 like operations per minute
  async toggleLike(@Request() req, @Body() toggleLikeDto: ToggleLikeDto): Promise<{ liked: boolean }> {
    const userId = req.user.id;
    const { contentType, contentId } = toggleLikeDto;
    
    const liked = await this.likeService.toggleLike(userId, contentType, contentId);
    return { liked };
  }

  /**
   * Check if the current user has liked a specific content
   */
  @Get('status/:contentType/:contentId')
  async checkLikeStatus(
    @Request() req,
    @Param('contentType') contentType: ContentType,
    @Param('contentId') contentId: string,
  ): Promise<{ liked: boolean }> {
    const userId = req.user.id;
    const liked = await this.likeService.hasLiked(userId, contentType, contentId);
    return { liked };
  }

  /**
   * Get the total number of likes for a specific content
   */
  @Get('count/:contentType/:contentId')
  async getLikeCount(
    @Param('contentType') contentType: ContentType,
    @Param('contentId') contentId: string,
  ): Promise<{ count: number }> {
    const count = await this.likeService.getLikeCount(contentType, contentId);
    return { count };
  }

  /**
   * Get users who liked a specific content with pagination
   */
  @Get('users/:contentType/:contentId')
  async getLikeUsers(
    @Param('contentType') contentType: ContentType,
    @Param('contentId') contentId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<UserEntity[]> {
    return this.likeService.getLikeUsers(contentType, contentId, paginationDto);
  }

  /**
   * Get all content of a specific type that the current user has liked
   */
  @Get('content/:contentType')
  async getLikedContent(
    @Request() req,
    @Param('contentType') contentType: ContentType,
    @Query() paginationDto: PaginationDto,
  ): Promise<LikeDto[]> {
    const userId = req.user.id;
    return this.likeService.getLikedContent(userId, contentType, paginationDto);
  }

  /**
   * Get feed of all content that the current user has liked
   */
  @Get('feed')
  async getLikedContentFeed(
    @Request() req,
    @Query() paginationDto: PaginationDto,
  ): Promise<LikeDto[]> {
    const userId = req.user.id;
    return this.likeService.getLikedContentFeed(userId, paginationDto);
  }
}

// ==== Event Implementation ====

// like/events/like.event.ts
import { ContentType } from '../enums/content-type.enum';

export class LikeEvent {
  constructor(
    public readonly userId: string,
    public readonly contentType: ContentType,
    public readonly contentId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// ==== Supporting Services ====

// authorization/authorization.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ContentType } from '../like/enums/content-type.enum';

@Injectable()
export class AuthorizationService {
  /**
   * Check if a user has permission to perform an action on content
   * @param userId User performing the action
   * @param action Action being performed (e.g., 'like')
   * @param contentType Type of content
   * @param contentId Content identifier
   * @throws ForbiddenException if user doesn't have permission
   */
  async checkPermission(
    userId: string,
    action: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    // In a real application, implement content privacy checks here:
    // - Check if content exists
    // - Check if content is public or if the user has access to it
    
    const canAccess = await this.canUserAccessContent(userId, contentType, contentId);
    
    if (!canAccess) {
      throw new ForbiddenException('You do not have permission to perform this action on this content');
    }
  }
  
  /**
   * Check if a user can access specific content
   * @param userId User attempting to access
   * @param contentType Type of content
   * @param contentId Content identifier
   * @returns Boolean indicating if user can access the content
   */
  private async canUserAccessContent(
    userId: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<boolean> {
    // In a real application, this would check:
    // 1. If the content exists
    // 2. If the content is public
    // 3. If the content is private, check if the user has permission to access it
    
    // For this demonstration, we'll assume all content is accessible
    return true;
  }
}

// notification/notification.service.ts
import { Injectable } from '@nestjs/common';
import { ContentType } from '../like/enums/content-type.enum';

@Injectable()
export class NotificationService {
  /**
   * Create a notification when a user likes content
   * @param likerUserId User who liked the content
   * @param contentType Type of content that was liked
   * @param contentId Content identifier
   */
  async createLikeNotification(
    likerUserId: string,
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    // Get the owner of the content
    const contentOwnerId = await this.getContentOwnerId(contentType, contentId);
    
    // Don't create notification if the liker is the content owner
    if (likerUserId === contentOwnerId) {
      return;
    }
    
    // In a real application:
    // 1. Create a notification record in database
    // 2. Potentially send a real-time notification via WebSockets
    
    console.log(`Creating like notification for user ${contentOwnerId} from user ${likerUserId} on content ${contentType}:${contentId}`);
  }
  
  /**
   * Get the user ID of the content owner
   * @param contentType Type of content
   * @param contentId Content identifier
   * @returns User ID of the content owner
   */
  private async getContentOwnerId(
    contentType: ContentType,
    contentId: string,
  ): Promise<string> {
    // In a real application, this would fetch the content from the appropriate service
    // and return the owner's user ID
    
    // For demonstration purposes, returning a placeholder ID
    return 'content-owner-id';
  }
}

// ==== Module Implementations ====

// like/like.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';

import { LikeService } from './like.service';
import { LikeController } from './like.controller';
import { Like } from './entities/like.entity';
import { NotificationModule } from '../notification/notification.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like]),
    EventEmitterModule.forRoot(),
    CacheModule.register(),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    NotificationModule,
    AuthorizationModule,
  ],
  providers: [LikeService],
  controllers: [LikeController],
  exports: [LikeService],
})
export class LikeModule {}

// authorization/authorization.module.ts
import { Module } from '@nestjs/common';
import { AuthorizationService } from './authorization.service';

@Module({
  providers: [AuthorizationService],
  exports: [AuthorizationService],
})
export class AuthorizationModule {}

// notification/notification.module.ts
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
