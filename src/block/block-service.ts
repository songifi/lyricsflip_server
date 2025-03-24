import { 
  Injectable, 
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BlockRepository } from './block.repository';
import { Block } from './block.entity';
import { User } from '../user/user.entity';
import { UserService } from '../user/user.service';
import { 
  CreateBlockDto, 
  BlockedUsersQueryDto,
  BlockStatusDto,
  BlockImpactDto
} from './block.dto';
import {
  UserBlockedEvent,
  UserUnblockedEvent,
  BlockListUpdatedEvent
} from './block.events';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class BlockService {
  private readonly logger = new Logger(BlockService.name);
  
  // Cache TTL in seconds (30 minutes)
  private readonly CACHE_TTL = 30 * 60;

  constructor(
    @InjectRepository(BlockRepository)
    private readonly blockRepository: BlockRepository,
    private readonly connection: Connection,
    private readonly eventEmitter: EventEmitter2,
    private readonly userService: UserService,
    private readonly cacheService: CacheService
  ) {}

  /**
   * Block a user
   */
  async blockUser(currentUser: User, createBlockDto: CreateBlockDto): Promise<Block> {
    const { blockedId, reason, metadata } = createBlockDto;
    
    // Prevent blocking self
    if (currentUser.id === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }
    
    // Check if target user exists
    const targetUser = await this.userService.findById(blockedId);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    
    // Check if already blocked
    const isBlocked = await this.blockRepository.hasBlocked(
      currentUser.id, 
      blockedId
    );
    
    if (isBlocked) {
      throw new ConflictException('You have already blocked this user');
    }
    
    // Execute in transaction
    return this.connection.transaction(async (manager: EntityManager) => {
      // Create block relationship
      const block = manager.create(Block, {
        blockerId: currentUser.id,
        blockedId,
        reason,
        metadata
      });
      
      const savedBlock = await manager.save(block);
      
      // Invalidate block caches
      await this.invalidateBlockCaches(currentUser.id, blockedId);
      
      // Get updated block count
      const blockCount = await this.blockRepository.getBlockedCount(currentUser.id);
      
      // Emit events
      this.eventEmitter.emit(
        'user.blocked',
        new UserBlockedEvent(currentUser.id, blockedId, savedBlock)
      );
      
      this.eventEmitter.emit(
        'block.list.updated',
        new BlockListUpdatedEvent(currentUser.id, blockCount)
      );
      
      return savedBlock;
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(currentUser: User, blockedId: string): Promise<void> {
    // Check if block exists
    const block = await this.blockRepository.findBlock(
      currentUser.id, 
      blockedId
    );
    
    if (!block) {
      throw new BadRequestException('You have not blocked this user');
    }
    
    // Execute in transaction
    await this.connection.transaction(async (manager: EntityManager) => {
      // Remove block relationship
      await manager.delete(Block, block.id);
      
      // Invalidate block caches
      await this.invalidateBlockCaches(currentUser.id, blockedId);
      
      // Get updated block count
      const blockCount = await this.blockRepository.getBlockedCount(currentUser.id);
      
      // Emit events
      this.eventEmitter.emit(
        'user.unblocked',
        new UserUnblockedEvent(currentUser.id, blockedId)
      );
      
      this.eventEmitter.emit(
        'block.list.updated',
        new BlockListUpdatedEvent(currentUser.id, blockCount)
      );
    });
  }

  /**
   * Get users blocked by the current user
   */
  async getBlockedUsers(
    userId: string, 
    queryDto: BlockedUsersQueryDto
  ): Promise<{ users: User[], total: number }> {
    const [blocks, total] = await this.blockRepository.getBlockedUsers(userId, queryDto);
    
    // Extract user objects
    const users = blocks.map(block => block.blocked);
    
    return { users, total };
  }

  /**
   * Get users who blocked the current user
   * Note: This might be restricted depending on your application's privacy rules
   */
  async getBlockingUsers(
    userId: string, 
    queryDto: BlockedUsersQueryDto
  ): Promise<{ users: User[], total: number }> {
    const [blocks, total] = await this.blockRepository.getBlockingUsers(userId, queryDto);
    
    // Extract user objects
    const users = blocks.map(block => block.blocker);
    
    return { users, total };
  }

  /**
   * Check if a user has blocked another user
   */
  async hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    // Check cache first
    const cacheKey = `block:status:${blockerId}:${blockedId}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult !== null) {
      return cachedResult === 'true';
    }
    
    // Get from database if not in cache
    const result = await this.blockRepository.hasBlocked(blockerId, blockedId);
    
    // Cache the result
    await this.cacheService.set(cacheKey, result.toString(), this.CACHE_TTL);
    
    return result;
  }

  /**
   * Check if either user has blocked the other (bidirectional check)
   */
  async hasAnyBlock(userId1: string, userId2: string): Promise<boolean> {
    const [user1BlockedUser2, user2BlockedUser1] = await Promise.all([
      this.hasBlocked(userId1, userId2),
      this.hasBlocked(userId2, userId1)
    ]);
    
    return user1BlockedUser2 || user2BlockedUser1;
  }

  /**
   * Get block status between two users
   */
  async getBlockStatus(userId: string, targetUserId: string): Promise<BlockStatusDto> {
    const [hasBlocked, isBlockedBy] = await Promise.all([
      this.hasBlocked(userId, targetUserId),
      this.hasBlocked(targetUserId, userId)
    ]);
    
    return { hasBlocked, isBlockedBy };
  }

  /**
   * Get all user IDs that should be excluded from content for a user
   * This includes users they've blocked and users who have blocked them
   */
  async getBlockImpact(userId: string): Promise<BlockImpactDto> {
    // Check cache first
    const cacheKey = `block:impact:${userId}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    
    // Get from database if not in cache
    const [blockedByMe, blockedMe] = await Promise.all([
      this.getBlockedUserIds(userId),
      this.getBlockerUserIds(userId)
    ]);
    
    // Combine all IDs that should be excluded from content
    const excludeUserIds = [...new Set([...blockedByMe, ...blockedMe])];
    
    const result: BlockImpactDto = {
      excludeUserIds,
      blockedByMe,
      blockedMe
    };
    
    // Cache the result
    await this.cacheService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    
    return result;
  }

  /**
   * Get IDs of all users blocked by a user
   */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    // Check cache first
    const cacheKey = `block:blocked:${userId}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    
    // Get from database if not in cache
    const blockedIds = await this.blockRepository.getBlockedUserIds(userId);
    
    // Cache the result
    await this.cacheService.set(cacheKey, JSON.stringify(blockedIds), this.CACHE_TTL);
    
    return blockedIds;
  }

  /**
   * Get IDs of all users who blocked a user
   */
  async getBlockerUserIds(userId: string): Promise<string[]> {
    // Check cache first
    const cacheKey = `block:blockers:${userId}`;
    const cachedResult = await this.cacheService.get(cacheKey);
    
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    
    // Get from database if not in cache
    const blockerIds = await this.blockRepository.getBlockerUserIds(userId);
    
    // Cache the result
    await this.cacheService.set(cacheKey, JSON.stringify(blockerIds), this.CACHE_TTL);
    
    return blockerIds;
  }

  /**
   * Get blocked count for a user
   */
  async getBlockedCount(userId: string): Promise<number> {
    return this.blockRepository.getBlockedCount(userId);
  }

  /**
   * Get blocking count for a user
   */
  async getBlockingCount(userId: string): Promise<number> {
    return this.blockRepository.getBlockingCount(userId);
  }

  /**
   * Invalidate block-related caches when blocks change
   */
  private async invalidateBlockCaches(userId1: string, userId2: string): Promise<void> {
    const keysToDelete = [
      `block:status:${userId1}:${userId2}`,
      `block:status:${userId2}:${userId1}`,
      `block:impact:${userId1}`,
      `block:impact:${userId2}`,
      `block:blocked:${userId1}`,
      `block:blocked:${userId2}`,
      `block:blockers:${userId1}`,
      `block:blockers:${userId2}`
    ];
    
    await Promise.all(keysToDelete.map(key => this.cacheService.del(key)));
  }
}
