import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentStatus, ContentType } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { PaginationQueryDto } from '../dto/pagination-query-dto';


@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const { parentId } = createCommentDto;
    let depth = 0;

    // Calculate depth for nested comments
    if (parentId) {
      const parentComment = await this.commentModel.findById(parentId);
      if (!parentComment) {
        throw new NotFoundException(`Parent comment with ID ${parentId} not found`);
      }
      
      depth = parentComment.depth + 1;
      
      // Optionally limit nesting depth
      if (depth > 3) {
        throw new BadRequestException('Maximum comment nesting depth reached');
      }
    }

    const newComment = new this.commentModel({
      ...createCommentDto,
      depth,
    });

    return newComment.save();
  }

  async findAll(paginationQuery: PaginationQueryDto): Promise<Comment[]> {
    const { limit = 10, offset = 0 } = paginationQuery;
    
    return this.commentModel
      .find({ status: CommentStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentModel.findById(id).exec();
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    return comment;
  }

  async findByContentId(
    contentType: ContentType,
    contentId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<Comment[]> {
    const { limit = 10, offset = 0 } = paginationQuery;
    
    // Find top-level comments first (those without parentId)
    return this.commentModel
      .find({
        contentType,
        contentId: new Types.ObjectId(contentId),
        parentId: null,
        status: CommentStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }

  async findReplies(
    parentId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<Comment[]> {
    const { limit = 10, offset = 0 } = paginationQuery;
    
    return this.commentModel
      .find({
        parentId: new Types.ObjectId(parentId),
        status: CommentStatus.ACTIVE,
      })
      .sort({ createdAt: 1 })  // Sort by oldest first for replies
      .skip(offset)
      .limit(limit)
      .exec();
  }

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const updatedComment = await this.commentModel
      .findByIdAndUpdate(id, updateCommentDto, { new: true })
      .exec();
      
    if (!updatedComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    return updatedComment;
  }

  async softDelete(id: string): Promise<Comment> {
    const deletedComment = await this.commentModel
      .findByIdAndUpdate(
        id,
        { status: CommentStatus.DELETED },
        { new: true },
      )
      .exec();
      
    if (!deletedComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    return deletedComment;
  }

  async flagComment(id: string): Promise<Comment> {
    const flaggedComment = await this.commentModel
      .findByIdAndUpdate(
        id,
        { status: CommentStatus.FLAGGED },
        { new: true },
      )
      .exec();
      
    if (!flaggedComment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
    
    return flaggedComment;
  }

  async getCommentTree(
    contentType: ContentType,
    contentId: string,
    maxDepth: number = 2,
  ): Promise<Comment[]> {
    // First get all top-level comments
    const topLevelComments = await this.commentModel
      .find({
        contentType,
        contentId: new Types.ObjectId(contentId),
        parentId: null,
        status: CommentStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    // If we need replies, populate them
    if (maxDepth > 0) {
      await this.populateReplies(topLevelComments, maxDepth, 1);
    }

    return topLevelComments;
  }

  private async populateReplies(
    comments: Comment[],
    maxDepth: number,
    currentDepth: number,
  ): Promise<void> {
    if (currentDepth >= maxDepth || comments.length === 0) {
      return;
    }

    for (const comment of comments) {
      const replies = await this.commentModel
        .find({
          parentId: comment._id,
          status: CommentStatus.ACTIVE,
        })
        .sort({ createdAt: 1 })
        .exec();

      (comment as any).replies = replies;

      // Recursively populate deeper levels
      if (replies.length > 0) {
        await this.populateReplies(replies, maxDepth, currentDepth + 1);
      }
    }
  }

  async findByUserId(
    userId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<Comment[]> {
    const { limit = 10, offset = 0 } = paginationQuery;
    
    return this.commentModel
      .find({
        userId: new Types.ObjectId(userId),
        status: CommentStatus.ACTIVE,
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .exec();
  }
}