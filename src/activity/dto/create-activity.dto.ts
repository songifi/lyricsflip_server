import { IsString, IsNotEmpty, IsEnum, IsMongoId, ValidateNested, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityType, ContentType } from '../schemas/activity.schema';

export class CreateActivityDto {
  @ApiProperty({
    description: 'User ID who performed the activity',
    example: '60d21b4667d0d8992e610c85'
  })
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    enum: ActivityType,
    description: 'Type of activity',
    example: ActivityType.LIKE
  })
  @IsEnum(ActivityType)
  @IsNotEmpty()
  activityType: ActivityType;

  @ApiProperty({
    enum: ContentType,
    description: 'Type of content',
    example: ContentType.POST
  })
  @IsEnum(ContentType)
  @IsNotEmpty()
  contentType: ContentType;

  @ApiProperty({
    description: 'ID of the related content',
    example: '60d21b4667d0d8992e610c86'
  })
  @IsMongoId()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'Additional metadata for the activity',
    example: {
      text: 'Great post!',
      postTitle: 'My first blog post'
    },
    required: false
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
