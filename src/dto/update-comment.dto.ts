import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CommentStatus } from '../schemas/comment.schema';

export class UpdateCommentDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  text?: string;

  @IsEnum(CommentStatus)
  @IsOptional()
  status?: CommentStatus;
}