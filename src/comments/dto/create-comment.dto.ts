// File: src/modules/comments/dto/create-comment.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsMongoId, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentType } from '../schemas/comment.schema';

export class CreateCommentDto {
  @ApiProperty({
    enum: ContentType,
    description: 'Type of content the comment is on',
    example: ContentType.SONG
  })
  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType: ContentType;

  @ApiProperty({
    description: 'ID of the content being commented on',
    example: '60d21b4667d0d8992e610c85'
  })
  @IsMongoId()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'ID of the parent comment (if this is a reply)',
    example: '60d21b4667d0d8992e610c86',
    required: false
  })
  @IsMongoId()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    description: 'Comment text content',
    example: 'This is a great song!',
    minLength: 1,
    maxLength: 2000
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  text: string;
}