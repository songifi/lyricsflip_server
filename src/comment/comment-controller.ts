// src/comments/comment.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CommentService } from './comment.service';
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
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';

@ApiTags('comments')
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: 201, description: 'Comment created successfully', type: CommentResponseDto })
  @RateLimit({ limit: 20, duration: 60 }) // 20 comments per minute
  async createComment(@Req() req, @Body() createCommentDto: CreateCommentDto): Promise<CommentResponseDto> {
    return this.commentService.createComment(req.user.id, createCommentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get comments with filtering options' })
  @ApiResponse({ status: 200, description: 'Returns filtered comments', type: CommentPaginatedResponseDto })
  async getComments(
    @Query() filters: CommentFilterDto,
    @Req() req
  ): Promise<CommentPaginatedResponseDto> {
    const userId = req.user?.id; // May be undefined for unauthenticated users
    return this.commentService.getComments(filters, userId);
  }

  @Get('activity')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comment activity feed for the current user' })
  @ApiResponse({ status: 200, description: 'Returns comment activity feed', type: CommentPaginatedResponseDto })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getActivityFeed(
    @Req() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ): Promise<CommentPaginatedResponseDto> {
    return this.commentService.getActivityFeed(req.user.id, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific comment by ID' })
  @ApiResponse({ status: 200, description: 'Returns the comment', type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  async getComment(@Param('id') id: string, @Req() req): Promise<CommentResponseDto> {
    const userId = req.user?.id; // May be undefined for unauthenticated users
    return this.commentService.getCommentById(id, userId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully', type: CommentResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment owner' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @RateLimit({ limit: 10, duration: 60 }) // 10 updates per minute
  async updateComment(
    @Param('id') id: string,
    @Req() req,
    @Body() updateCommentDto: UpdateCommentDto
  ): Promise<CommentResponseDto> {
    return this.commentService.updateComment(id, req.user.id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the comment owner or moderator' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('id') id: string, @Req() req): Promise<void> {
    const user = req.user;
    const isModerator = user.roles && user.roles.includes('moderator');
    
    return this.commentService.deleteComment(id, user.id, isModerator);
  }

  @Post(':id/like')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like or unlike a comment' })
  @ApiResponse({ status: 200, description: 'Like toggled successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @RateLimit({ limit: 30, duration: 60 }) // 30 likes per minute
  async toggleLike(@Param('id') id: string, @Req() req): Promise<{ liked: boolean; likesCount: number }> {
    return this.commentService.toggleLike(id, req.user.id);
  }

  @Post(':id/report')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a comment for moderation' })
  @ApiResponse({ status: 204, description: 'Comment reported successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 5, duration: 60 }) // 5 reports per minute
  async reportComment(
    @Param('id') id: string,
    @Req() req,
    @Body() reportDto: ReportCommentDto
  ): Promise<void> {
    return this.commentService.reportComment(id, req.user.id, reportDto);
  }

  // MODERATOR ENDPOINTS

  @Get('reports')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('moderator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reports for moderation (moderators only)' })
  @ApiResponse({ status: 200, description: 'Returns list of reports' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a moderator' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getReports(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.commentService.getReports(status, limit, offset);
  }

  @Post('reports/:id/resolve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('moderator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve a comment report (moderators only)' })
  @ApiResponse({ status: 204, description: 'Report resolved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a moderator' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resolveReport(
    @Param('id') id: string,
    @Req() req,
    @Body() resolveDto: ResolveReportDto
  ): Promise<void> {
    return this.commentService.resolveReport(id, req.user.id, resolveDto);
  }

  @Post(':id/moderate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('moderator', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderate a comment (moderators only)' })
  @ApiResponse({ status: 204, description: 'Comment moderated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a moderator' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async moderateComment(
    @Param('id') id: string,
    @Req() req,
    @Body() moderateDto: ModerateCommentDto
  ): Promise<void> {
    return this.commentService.moderateComment(id, req.user.id, moderateDto);
  }
}
