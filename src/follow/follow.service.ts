import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Follow, FollowStatus } from '../schemas/follow.schema';
import { CreateFollowDto } from '../dto/create-follow.dto';
import { UpdateFollowStatusDto } from '../dto/update-follow-status.dto';
import { FollowQueryDto } from '../dto/follow-query.dto';
import { User } from '../schemas/user.schema';

@Injectable()
export class FollowService {
  constructor(
    @InjectModel(Follow.name) private readonly followModel: Model<Follow>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Create a new follow relationship
   */
  async createFollow(userId: string, createFollowDto: CreateFollowDto): Promise<Follow> {
    // Prevent users from following themselves
    if (userId === createFollowDto.followeeId) {
      throw new ConflictException('You cannot follow yourself');
    }

    // Check if the followee exists
    const followeeExists = await this.userModel.exists({ _id: createFollowDto.followeeId });
    if (!followeeExists) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if relationship already exists
    const existingFollow = await this.followModel.findOne({
      followerId: userId,
      followeeId: createFollowDto.followeeId,
    });

    if (existingFollow) {
      if (existingFollow.status === FollowStatus.BLOCKED) {
        throw new ForbiddenException('Cannot follow this user');
      }
      
      throw new ConflictException('You are already following or have a pending request to follow this user');
    }

    // TODO: For private accounts, set status to PENDING and wait for approval
    // For now, automatically set to ACTIVE

    const follow = new this.followModel({
      followerId: userId,
      followeeId: createFollowDto.followeeId,
      status: FollowStatus.ACTIVE, // Default to active for now
    });

    return follow.save();
  }

  /**
   * Update follow status (accept/reject/block)
   */
  async updateFollowStatus(
    userId: string,
    followId: string,
    updateFollowStatusDto: UpdateFollowStatusDto,
  ): Promise<Follow> {
    const follow = await this.followModel.findById(followId);

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    // Only the followee can update the status (except for unfollow)
    if (follow.followeeId.toString() !== userId) {
      throw new ForbiddenException('You cannot update this follow relationship');
    }

    follow.status = updateFollowStatusDto.status;
    follow.updatedAt = new Date();

    return follow.save();
  }

  /**
   * Unfollow a user
   */
  async unfollow(userId: string, followeeId: string): Promise<void> {
    const result = await this.followModel.deleteOne({
      followerId: userId,
      followeeId: followeeId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('You are not following this user');
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, query: FollowQueryDto): Promise<{ followers: Follow[]; total: number }> {
    const filter: any = {
      followeeId: userId,
    };

    if (query.status) {
      filter.status = query.status;
    } else {
      // Default to only active follows
      filter.status = FollowStatus.ACTIVE;
    }

    const total = await this.followModel.countDocuments(filter);
    
    const followers = await this.followModel
      .find(filter)
      .populate('followerId', 'username profile.avatar')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 10))
      .limit(query.limit ?? 10)
      .sort({ createdAt: -1 })
      .exec();

    return { followers, total };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, query: FollowQueryDto): Promise<{ following: Follow[]; total: number }> {
    const filter: any = {
      followerId: userId,
    };

    if (query.status) {
      filter.status = query.status;
    } else {
      // Default to only active follows
      filter.status = FollowStatus.ACTIVE;
    }

    const total = await this.followModel.countDocuments(filter);
    
    const following = await this.followModel
      .find(filter)
      .populate('followeeId', 'username profile.avatar')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 10))
      .limit(query.limit ?? 10)
      .sort({ createdAt: -1 })
      .exec();

    return { following, total };
  }

  /**
   * Check if a user is following another user
   */
  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const follow = await this.followModel.findOne({
      followerId,
      followeeId,
      status: FollowStatus.ACTIVE,
    });

    return !!follow;
  }

  /**
   * Get pending follow requests for a user
   */
  async getPendingRequests(userId: string, query: FollowQueryDto): Promise<{ requests: Follow[]; total: number }> {
    const filter = {
      followeeId: userId,
      status: FollowStatus.PENDING,
    };

    const total = await this.followModel.countDocuments(filter);
    
    const requests = await this.followModel
      .find(filter)
      .populate('followerId', 'username profile.avatar')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 10))
      .limit(query.limit ?? 10)
      .sort({ createdAt: -1 })
      .exec();

    return { requests, total };
  }
}