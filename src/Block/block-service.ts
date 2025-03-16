// src/modules/block/block.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Block } from './schemas/block.schema';
import { User } from '../user/schemas/user.schema';
import { CreateBlockDto } from './dto/create-block.dto';
import { BlockQueryDto } from './dto/block-query.dto';

@Injectable()
export class BlockService {
  constructor(
    @InjectModel(Block.name) private readonly blockModel: Model<Block>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Block a user
   */
  async blockUser(blockerId: string, createBlockDto: CreateBlockDto): Promise<Block> {
    const { blockedId, reason } = createBlockDto;
    
    // Prevent users from blocking themselves
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }

    // Check if the blocked user exists
    const blockedUserExists = await this.userModel.exists({ _id: blockedId });
    if (!blockedUserExists) {
      throw new NotFoundException('User to block not found');
    }

    // Check if block relationship already exists
    const existingBlock = await this.blockModel.findOne({
      blockerId,
      blockedId,
    });

    if (existingBlock) {
      throw new ConflictException('You have already blocked this user');
    }

    // Create new block
    const block = new this.blockModel({
      blockerId,
      blockedId,
      reason: reason || '',
      createdAt: new Date(),
    });

    return block.save();
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const result = await this.blockModel.deleteOne({
      blockerId,
      blockedId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Block relationship not found');
    }
  }

  /**
   * Get users blocked by current user
   */
  async getBlockedUsers(
    blockerId: string,
    query: BlockQueryDto
  ): Promise<{ blocks: Block[]; total: number }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    
    const filter = { blockerId };
    
    const total = await this.blockModel.countDocuments(filter);
    
    const blocks = await this.blockModel
      .find(filter)
      .populate('blockedId', 'username profile.avatar')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return { blocks, total };
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.blockModel.findOne({
      blockerId,
      blockedId,
    });

    return !!block;
  }

  /**
   * Check if current user is blocked by another user
   */
  async isBlockedBy(userId: string, otherUserId: string): Promise<boolean> {
    const block = await this.blockModel.findOne({
      blockerId: otherUserId,
      blockedId: userId,
    });

    return !!block;
  }

  /**
   * Get all block relationships involving a user (either as blocker or blocked)
   * This is useful for content filtering
   */
  async getUserBlockRelationships(userId: string): Promise<Block[]> {
    return this.blockModel
      .find({
        $or: [
          { blockerId: userId },
          { blockedId: userId },
        ],
      })
      .exec();
  }
}
