import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ContentType } from '../comment.schema';

export class CreateCommentDto {
  @IsMongoId()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType!: ContentType;

  @IsMongoId()
  @IsNotEmpty()
  contentId!: string;

  @IsMongoId()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text!: string;
}