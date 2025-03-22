// File: src/modules/comments/controllers/comment.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiQuery,
  } from '@nestjs/swagger';
  import { CommentService } from '../services/comment.service';
  import { CreateCommentDto } from '../dto/create-comment.dto';
  import { UpdateCommentDto } from '../dto/update-comment.dto';
  import { UpdateStatusDto } from '../dto/update-status.dto';
  import { PaginationQueryDto } from '../dto/pagination-query.dto';
  import { CommentResponseDto } from '../dto/comment-response.dto';
  import { ContentType, CommentStatus } from '../schemas/comment.schema';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { RolesGuard } from '../../auth/guards/roles.guard';
  import { Roles } from '../../auth/decorators/roles.decorator';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  
  @ApiTags('comments')
  @Controller('comments')
  export class CommentController {
    constructor(private readonly commentService: CommentService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new comment' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Comment created successfully',
      type: CommentResponseDto,
    })
    @ApiBody({ type: CreateCommentDto })
    async create(
      @CurrentUser() userId: string,
      @Body() createCommentDto: CreateCommentDto,
    ) {
      const comment = await this.commentService.create(userId, createCommentDto);
      return this.mapToCommentResponse(comment);
    }
  
    @Get('content/:contentType/:contentId')
    @ApiOperation({ summary: 'Get comments for specific content' })
    @ApiParam({ name: 'contentType', enum: ContentType, description: 'Content type' })
    @ApiParam({ name: 'contentId', description: 'Content ID' })
    @ApiQuery({ type: PaginationQueryDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Comments retrieved successfully',
      type: [CommentResponseDto],
    })
    async findByContent(
      @Param('contentType') contentType: ContentType,
      @Param('contentId') contentId: string,
      @Query() query: PaginationQueryDto,
    ) {
      const result = await this.commentService.findByContent(contentType, contentId, query);
      
      return {
        comments: result.comments.map(comment => this.mapToCommentResponse(comment)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }
  
    @Get(':id/replies')
    @ApiOperation({ summary: 'Get replies for a comment' })
    @ApiParam({ name: 'id', description: 'Comment ID' })
    @ApiQuery({ type: PaginationQueryDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Replies retrieved successfully',
      type: [CommentResponseDto],
    })
    async findReplies(
      @Param('id') commentId: string,
      @Query() query: PaginationQueryDto,
    ) {
      const result = await this.commentService.findReplies(commentId, query);
      
      return {
        replies: result.replies.map(reply => this.mapToCommentResponse(reply)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a comment by ID' })
    @ApiParam({ name: 'id', description: 'Comment ID' })
    @ApiQuery({ 
      name: 'includeReplies', 
      required: false, 
      type: Boolean,
      description: 'Include replies in the response'
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Comment retrieved successfully',
      type: CommentResponseDto,
    })
    async findOne(
      @Param('id') commentId: string,
      @Query('includeReplies') includeReplies?: boolean,
    ) {
      const comment = await this.commentService.findOne(commentId, includeReplies);
      return this.mapToCommentResponse(comment);
    }
  
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a comment' })
    @ApiParam({ name: 'id', description: 'Comment ID' })
    @ApiBody({ type: UpdateCommentDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Comment updated successfully',
      type: CommentResponseDto,
    })
    async update(
      @CurrentUser() userId: string,
      @Param('id') commentId: string,
      @Body() updateCommentDto: UpdateCommentDto,
    ) {
      const comment = await this.commentService.update(commentId, userId, updateCommentDto);
      return this.mapToCommentResponse(comment);
    }
  
    @Patch(':id/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a comment status' })
    @ApiParam({ name: 'id', description: 'Comment ID' })
    @ApiBody({ type: UpdateStatusDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Comment status updated successfully',
      type: CommentResponseDto,
    })
    async updateStatus(
      @CurrentUser() userId: string,
      @Param('id') commentId: string,
      @Body() updateStatusDto: UpdateStatusDto,
    ) {
      // Check if user has admin role - for simplicity, assuming false for normal users
      const isAdmin = false; // In a real app, this would be determined by roles/permissions
      
      const comment = await this.commentService.updateStatus(
        commentId, 
        userId, 
        updateStatusDto,
        isAdmin
      );
      
      return this.mapToCommentResponse(comment);
    }
  
    @Patch(':id/status/admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'moderator')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Admin: Update a comment status' })
    @ApiParam({ name: 'id', description: 'Comment ID' })
    @ApiBody({ type: UpdateStatusDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Comment status updated successfully by admin',
      type: CommentResponseDto,
    })
    async adminUpdateStatus(
      @CurrentUser() userId: string,
      @Param('id') commentId: string,
      @Body() updateStatusDto: UpdateStatusDto,
    ) {
      const comment = await this.commentService.updateStatus(
        commentId, 
        userId, 
        updateStatusDto,
        true // Admin mode
      );
      
      return this.mapToCommentResponse(comment);
    }
  
    @Get('user/:userId')
    @ApiOperation({ summary: 'Get comments by user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiQuery({ type: PaginationQueryDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'User comments retrieved successfully',
      type: [CommentResponseDto],
    })
    async findByUser(
      @Param('userId') userId: string,
      @Query() query: PaginationQueryDto,
    ) {
      const result = await this.commentService.findByUser(userId, query);
      
      return {
        comments: result.comments.map(comment => this.mapToCommentResponse(comment)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }
  
    @Get('stats/:contentType/:contentId')
    @ApiOperation({ summary: 'Get comment statistics for content' })
    @ApiParam({ name: 'contentType', enum: ContentType, description: 'Content type' })
    @ApiParam({ name: 'contentId', description: 'Content ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Comment statistics retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          total: { type: 'number', example: 100 },
          active: { type: 'number', example: 85 },
          flagged: { type: 'number', example: 10 },
          deleted: { type: 'number', example: 5 },
        },
      },
    })
    async getContentStats(
      @Param('contentType') contentType: ContentType,
      @Param('contentId') contentId: string,
    ) {
      return this.commentService.getContentStats(contentType, contentId);
    }
  
    /**
     * Map comment document to response DTO
     */
    private mapToCommentResponse(comment: any): CommentResponseDto {
      const response: CommentResponseDto = {
        id: comment._id.toString(),
        userId: comment.userId._id ? comment.userId._id.toString() : comment.userId.toString(),
        user: comment.userId._id ? {
          id: comment.userId._id.toString(),
          name: comment.userId.name || 'Unknown User',
          avatar: comment.userId.avatar,
        } : null,
        contentType: comment.contentType,
        contentId: comment.contentId.toString(),
        parentId: comment.parentId ? comment.parentId.toString() : null,
        text: comment.text,
        status: comment.status,
        likesCount: comment.likesCount,
        repliesCount: comment.repliesCount,
        depth: comment.depth,
        isEdited: comment.isEdited,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
      
      // Add replies if they were populated
      if (comment.replies && Array.isArray(comment.replies)) {
        response.replies = comment.replies.map(reply => this.mapToCommentResponse(reply));
      }
      
      return response;
    }
  }