// File: src/modules/comments/dto/update-status.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CommentStatus } from '../schemas/comment.schema';

export class UpdateStatusDto {
  @ApiProperty({
    enum: CommentStatus,
    description: 'New status for the comment',
    example: CommentStatus.FLAGGED
  })
  @IsEnum(CommentStatus)
  @IsNotEmpty()
  status: CommentStatus;
}