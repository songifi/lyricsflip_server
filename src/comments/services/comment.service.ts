// File: src/modules/comments/services/comment.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument, CommentStatus, ContentType } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  /**
   * Create a new comment
   */
  async create(userId: string, createCommentDto: CreateCommentDto): Promise<CommentDocument> {
    const { contentType, contentId, parentId, text } = createCommentDto;
    
    // If this is a reply, verify parent comment exists and get its depth
    let depth = 0;
    if (parentId) {
      const parentComment = await this.commentModel.findById(parentId).exec();
      
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
      
      if (parentComment.status === CommentStatus.DELETED) {
        throw new BadRequestException('Cannot reply to a deleted comment');
      }
      
      // Ensure we're replying to a comment on the same content
      if (parentComment.contentType !== contentType || 
          parentComment.contentId.toString() !== contentId) {
        throw new BadRequestException('Parent comment does not belong to the specified content');
      }
      
      // Calculate depth (parent depth + 1)
      depth = parentComment.depth + 1;
      
      // Limit nesting depth
      if (depth > 5) {
        throw new BadRequestException('Maximum comment nesting depth exceeded');
      }
      
      // Increment parent's reply count
      await this.commentModel.findByIdAndUpdate(
        parentId,
        { $inc: { repliesCount: 1 } }
      ).exec();
    }
    
    // Create and save the new comment
    const newComment = new this.commentModel({
      userId: new Types.ObjectId(userId),
      contentType,
      contentId: new Types.ObjectId(contentId),
      parentId: parentId ? new Types.ObjectId(parentId) : null,
      text,
      status: CommentStatus.ACTIVE,
      depth,
    });
    
    return newComment.save();
  }

  /**
   * Get comments for specific content with pagination
   */
  async findByContent(
    contentType: ContentType,
    contentId: string,
    query: PaginationQueryDto
  ): Promise<{ comments: CommentDocument[], total: number, page: number, limit: number }> {
    const { page = 1, limit = 20, status = CommentStatus.ACTIVE, includeReplies = false, sortByRecent = true } = query;
    const skip = (page - 1) * limit;
    
    // Only get top-level comments (no parent)
    const filter = {
      contentType,
      contentId: new Types.ObjectId(contentId),
      status,
      parentId: null,
    };
    
    // Count total top-level comments
    const total = await this.commentModel.countDocuments(filter);
    
    // Build base query
    let commentsQuery = this.commentModel
      .find(filter)
      .sort({ createdAt: sortByRecent ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatar');
    
    // Include replies if requested
    if (includeReplies) {
      commentsQuery = commentsQuery.populate({
        path: 'replies',
        match: { status },
        options: { sort: { createdAt: 1 } },
        populate: {
          path: 'userId',
          select: 'name avatar',
        },
      });
    }
    
    // Execute query
    const comments = await commentsQuery.exec();
    
    return {
      comments,
      total,
      page,
      limit,
    };
  }

  /**
   * Get replies for a specific comment
   */
  async findReplies(
    commentId: string,
    query: PaginationQueryDto
  ): Promise<{ replies: CommentDocument[], total: number, page: number, limit: number }> {
    const { page = 1, limit = 20, status = CommentStatus.ACTIVE, sortByRecent = false } = query;
    const skip = (page - 1) * limit;
    
    // Verify the parent comment exists
    const parentComment = await this.commentModel.findById(commentId).exec();
    if (!parentComment) {
      throw new NotFoundException('Comment not found');
    }
    
    // Build query for replies
    const filter = {
      parentId: new Types.ObjectId(commentId),
      status,
    };
    
    // Count total replies
    const total = await this.commentModel.countDocuments(filter);
    
    // Get replies with pagination
    const replies = await this.commentModel
      .find(filter)
      .sort({ createdAt: sortByRecent ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatar')
      .exec();
    
    return {
      replies,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single comment by ID with replies
   */
  async findOne(
    commentId: string,
    includeReplies = false
  ): Promise<CommentDocument> {
    let query = this.commentModel
      .findById(commentId)
      .populate('userId', 'name avatar');
    
    if (includeReplies) {
      query = query.populate({
        path: 'replies',
        match: { status: CommentStatus.ACTIVE },
        options: { sort: { createdAt: 1 } },
        populate: {
          path: 'userId',
          select: 'name avatar',
        },
      });
    }
    
    const comment = await query.exec();
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    
    return comment;
  }

  /**
   * Update a comment's text
   */
  async update(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(commentId).exec();
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    
    // Check if user is the comment author
    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    
    // Check if comment is deleted
    if (comment.status === CommentStatus.DELETED) {
      throw new BadRequestException('Cannot edit a deleted comment');
    }
    
    // Update the comment
    comment.text = updateCommentDto.text;
    comment.isEdited = true;
    
    return comment.save();
  }

  /**
   * Update a comment's status
   */
  async updateStatus(
    commentId: string,
    userId: string,
    updateStatusDto: UpdateStatusDto,
    isAdmin = false
  ): Promise<CommentDocument> {
    const comment = await this.commentModel.findById(commentId).exec();
    
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    
    // Regular users can only delete their own comments
    if (!isAdmin && comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only change status of your own comments');
    }
    
    // Regular users can only set status to DELETED
    if (!isAdmin && updateStatusDto.status !== CommentStatus.DELETED) {
      throw new ForbiddenException('You can only delete comments, not change other statuses');
    }
    
    // Update status
    comment.status = updateStatusDto.status;
    
    // If marking as deleted and there are replies, we keep the comment structure
    // but remove the content
    if (updateStatusDto.status === CommentStatus.DELETED && comment.repliesCount > 0) {
      comment.text = '[Comment deleted]';
    }
    
    return comment.save();
  }

  /**
   * Get comments by user
   */
  async findByUser(
    userId: string,
    query: PaginationQueryDto
  ): Promise<{ comments: CommentDocument[], total: number, page: number, limit: number }> {
    const { page = 1, limit = 20, status = CommentStatus.ACTIVE, sortByRecent = true } = query;
    const skip = (page - 1) * limit;
    
    // Build query for user's comments
    const filter = {
      userId: new Types.ObjectId(userId),
      status,
    };
    
    // Count total user comments
    const total = await this.commentModel.countDocuments(filter);
    
    // Get comments with pagination
    const comments = await this.commentModel
      .find(filter)
      .sort({ createdAt: sortByRecent ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name avatar')
      .exec();
    
    return {
      comments,
      total,
      page,
      limit,
    };
  }

  /**
   * Get comment statistics for content
   */
  async getContentStats(contentType: ContentType, contentId: string): Promise<{ 
    total: number, 
    active: number,
    flagged: number,
    deleted: number,
  }> {
    const stats = await this.commentModel.aggregate([
      { 
        $match: { 
          contentType, 
          contentId: new Types.ObjectId(contentId) 
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).exec();
    
    // Initialize counters
    const result = {
      total: 0,
      active: 0,
      flagged: 0,
      deleted: 0,
    };
    
    // Process aggregation results
    stats.forEach(stat => {
      result[stat._id.toLowerCase()] = stat.count;
      result.total += stat.count;
    });
    
    return result;
  }
}