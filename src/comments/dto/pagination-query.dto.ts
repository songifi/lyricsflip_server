// File: src/modules/comments/dto/pagination-query.dto.ts
import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CommentStatus } from '../schemas/comment.schema';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    default: 20,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    enum: CommentStatus,
    description: 'Filter by comment status',
    example: CommentStatus.ACTIVE,
    required: false
  })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus = CommentStatus.ACTIVE;

  @ApiProperty({
    description: 'Include replies in response',
    example: true,
    default: false,
    required: false
  })
  @IsOptional()
  @Type(() => Boolean)
  includeReplies?: boolean = false;

  @ApiProperty({
    description: 'Sort by most recent (true) or oldest (false)',
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @Type(() => Boolean)
  sortByRecent?: boolean = true;
}
