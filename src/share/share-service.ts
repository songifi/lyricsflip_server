// src/modules/share/share.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Share, ContentType, TargetType } from './schemas/share.schema';
import { CreateShareDto } from './dto/create-share.dto';
import { QueryShareDto } from './dto/query-share.dto';
import { User } from '../user/schemas/user.schema';

@Injectable()
export class ShareService {
  constructor(
    @InjectModel(Share.name) private shareModel: Model<Share>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  /**
   * Create a new share
   */
  async create(userId: string, createShareDto: CreateShareDto): Promise<Share> {
    // Validate content exists based on contentType
    await this.validateContent(createShareDto.contentType, createShareDto.contentId);
    
    // For internal shares, validate that target user exists
    if (createShareDto.targetType === TargetType.INTERNAL && createShareDto.targetId) {
      const targetUserExists = await this.userModel.exists({ _id: createShareDto.targetId });
      if (!targetUserExists) {
        throw new NotFoundException('Target user not found');
      }
    }

    const newShare = new this.shareModel({
      userId,
      ...createShareDto,
    });

    return newShare.save();
  }

  /**
   * Get shares based on query parameters
   */
  async findAll(queryShareDto: QueryShareDto): Promise<{ shares: Share[]; total: number }> {
    const { contentType, contentId, targetType, userId, page = 1, limit = 20 } = queryShareDto;
    const skip = (page - 1) * limit;
    
    // Build filter based on provided query parameters
    const filter: any = {};
    
    if (contentType) filter.contentType = contentType;
    if (contentId) filter.contentId = contentId;
    if (targetType) filter.targetType = targetType;
    if (userId) filter.userId = userId;

    // Get total count
    const total = await this.shareModel.countDocuments(filter);
    
    // Get paginated results
    const shares = await this.shareModel
      .find(filter)
      .populate('userId', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { shares, total };
  }

  /**
   * Get a specific share by ID
   */
  async findOne(id: string): Promise<Share> {
    const isValidId = Types.ObjectId.isValid(id);
    if (!isValidId) {
      throw new BadRequestException('Invalid share ID');
    }

    const share = await this.shareModel
      .findById(id)
      .populate('userId', 'username profile.avatar')
      .exec();
      
    if (!share) {
      throw new NotFoundException('Share not found');
    }
    
    return share;
  }

  /**
   * Get shares by content
   */
  async findByContent(
    contentType: ContentType, 
    contentId: string
  ): Promise<{ shares: Share[]; total: number }> {
    const filter = { contentType, contentId };
    
    const total = await this.shareModel.countDocuments(filter);
    
    const shares = await this.shareModel
      .find(filter)
      .populate('userId', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .exec();

    return { shares, total };
  }

  /**
   * Get shares by user
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ shares: Share[]; total: number }> {
    const filter = { userId };
    const skip = (page - 1) * limit;
    
    const total = await this.shareModel.countDocuments(filter);
    
    const shares = await this.shareModel
      .find(filter)
      .populate('userId', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { shares, total };
  }

  /**
   * Delete a share
   */
  async remove(id: string, userId: string): Promise<void> {
    const share = await this.shareModel.findById(id);
    
    if (!share) {
      throw new NotFoundException('Share not found');
    }
    
    if (share.userId.toString() !== userId) {
      throw new BadRequestException('You do not have permission to delete this share');
    }
    
    await this.shareModel.findByIdAndDelete(id);
  }

  /**
   * Get share analytics
   */
  async getAnalytics(contentType: ContentType, contentId: string): Promise<any> {
    const result = await this.shareModel.aggregate([
      { $match: { contentType, contentId: new Types.ObjectId(contentId) } },
      { $group: { _id: '$targetType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    return {
      totalShares: result.reduce((acc, curr) => acc + curr.count, 0),
      sharesByPlatform: result.map(item => ({
        platform: item._id,
        count: item.count
      }))
    };
  }

  /**
   * Validate that the content exists
   * This method should be implemented based on your database structure
   */
  private async validateContent(contentType: ContentType, contentId: string): Promise<void> {
    // This is a placeholder implementation
    // In a real application, you would check the existence of the content based on its type
    
    const isValidId = Types.ObjectId.isValid(contentId);
    if (!isValidId) {
      throw new BadRequestException('Invalid content ID');
    }
    
    let exists = false;
    
    switch (contentType) {
      case ContentType.SONG:
        // Check if song exists
        // exists = await this.songModel.exists({ _id: contentId });
        exists = true; // Placeholder
        break;
      case ContentType.PLAYLIST:
        // Check if playlist exists
        // exists = await this.playlistModel.exists({ _id: contentId });
        exists = true; // Placeholder
        break;
      case ContentType.GAME_RESULT:
        // Check if game result exists
        // exists = await this.gameResultModel.exists({ _id: contentId });
        exists = true; // Placeholder
        break;
      case ContentType.PROFILE:
        // Check if user exists
        exists = await this.userModel.exists({ _id: contentId });
        break;
      case ContentType.ALBUM:
        // Check if album exists
        // exists = await this.albumModel.exists({ _id: contentId });
        exists = true; // Placeholder
        break;
      default:
        throw new BadRequestException('Invalid content type');
    }
    
    if (!exists) {
      throw new NotFoundException(`${contentType} with ID ${contentId} not found`);
    }
  }
}
