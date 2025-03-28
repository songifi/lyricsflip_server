// src/comments/dto/comment.dto.ts

import { 
  IsString, 
  IsUUID, 
  IsOptional, 
  IsEnum, 
  IsInt, 
  Min, 
  Max,
  Length,
  IsBoolean 
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommentStatus, CommentSortOrder, ReportReason, ReportStatus } from '../comment.constants';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'The content ID that this comment belongs to' })
  @IsUUID()
  contentId: string;

  @ApiProperty({ description: 'The text of the comment', minLength: 1, maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  text: string;

  @ApiPropertyOptional({ description: 'The parent comment ID if this is a reply' })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'The updated text of the comment', minLength: 1, maxLength: 5000 })
  @IsString()
  @Length(1, 5000)
  text: string;
}

export class ModerateCommentDto {
  @ApiProperty({ 
    description: 'The new status of the comment',
    enum: CommentStatus 
  })
  @IsEnum(CommentStatus)
  status: CommentStatus;

  @ApiPropertyOptional({ description: 'Notes for the moderation action' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReportCommentDto {
  @ApiProperty({ 
    description: 'The reason for reporting the comment',
    enum: ReportReason 
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ description: 'Additional details about the report' })
  @IsString()
  @IsOptional()
  details?: string;
}

export class ResolveReportDto {
  @ApiProperty({ 
    description: 'The resolution status for the report',
    enum: ReportStatus 
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'Notes about the resolution' })
  @IsString()
  @IsOptional()
  resolutionNotes?: string;
}

export class CommentFilterDto {
  @ApiPropertyOptional({ description: 'ID of the content to get comments for' })
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({ description: 'ID of the user to get comments for' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Get only parent comments or all comments' })
  @IsBoolean()
  @IsOptional()
  parentOnly?: boolean;

  @ApiPropertyOptional({ description: 'ID of the parent comment to get replies for' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ 
    description: 'Comment status to filter by',
    enum: CommentStatus 
  })
  @IsEnum(CommentStatus)
  @IsOptional()
  status?: CommentStatus;

  @ApiPropertyOptional({ 
    description: 'How to sort the comments',
    enum: CommentSortOrder,
    default: CommentSortOrder.NEWEST
  })
  @IsEnum(CommentSortOrder)
  @IsOptional()
  sortOrder?: CommentSortOrder;

  @ApiPropertyOptional({ description: 'Max number of results to return', default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}

export class CommentResponseDto {
  @ApiProperty({ description: 'Unique identifier of the comment' })
  id: string;

  @ApiProperty({ description: 'ID of the content this comment belongs to' })
  contentId: string;

  @ApiProperty({ description: 'ID of the user who created the comment' })
  userId: string;

  @ApiProperty({ description: 'Username of the user who created the comment' })
  username: string;

  @ApiProperty({ description: 'Avatar URL of the user who created the comment' })
  userAvatar?: string;

  @ApiProperty({ description: 'Text content of the comment' })
  text: string;

  @ApiProperty({ 
    description: 'Status of the comment',
    enum: CommentStatus 
  })
  status: CommentStatus;

  @ApiPropertyOptional({ description: 'ID of the parent comment if this is a reply' })
  parentId?: string;

  @ApiProperty({ description: 'Depth level of the comment in the comment tree' })
  depth: number;

  @ApiProperty({ description: 'Path to the comment in the comment tree' })
  path: string;

  @ApiProperty({ description: 'Number of likes the comment has received' })
  likesCount: number;

  @ApiProperty({ description: 'Number of replies to this comment' })
  repliesCount: number;

  @ApiProperty({ description: 'Whether the current user has liked this comment' })
  isLiked: boolean;

  @ApiProperty({ description: 'Whether the comment has been edited' })
  isEdited: boolean;

  @ApiPropertyOptional({ description: 'When the comment was last edited' })
  editedAt?: Date;

  @ApiProperty({ description: 'When the comment was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the comment was last updated' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Array of replies to this comment' })
  replies?: CommentResponseDto[];
}

export class CommentPaginatedResponseDto {
  @ApiProperty({ description: 'Array of comments' })
  data: CommentResponseDto[];

  @ApiProperty({ description: 'Total number of comments' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of comments per page' })
  limit: number;

  @ApiProperty({ description: 'Whether there are more comments to load' })
  hasMore: boolean;
}

export class ReportResponseDto {
  @ApiProperty({ description: 'Unique identifier of the report' })
  id: string;

  @ApiProperty({ description: 'ID of the comment that was reported' })
  commentId: string;

  @ApiProperty({ description: 'ID of the user who reported the comment' })
  reporterId: string;

  @ApiProperty({ 
    description: 'Reason for the report',
    enum: ReportReason 
  })
  reason: ReportReason;

  @ApiPropertyOptional({ description: 'Additional details about the report' })
  details?: string;

  @ApiProperty({ 
    description: 'Status of the report',
    enum: ReportStatus 
  })
  status: ReportStatus;

  @ApiPropertyOptional({ description: 'ID of the moderator who handled the report' })
  moderatorId?: string;

  @ApiPropertyOptional({ description: 'Notes about the resolution' })
  resolutionNotes?: string;

  @ApiProperty({ description: 'When the report was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the report was last updated' })
  updatedAt: Date;
}
