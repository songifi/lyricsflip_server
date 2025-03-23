import { IsOptional, IsEnum, IsMongoId, IsArray, IsDate, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ActivityType, ContentType } from '../schemas/activity.schema';

export class QueryActivityDto {
  @ApiProperty({
    description: 'Filter by user ID',
    example: '60d21b4667d0d8992e610c85',
    required: false
  })
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    enum: ActivityType,
    description: 'Filter by activity type',
    isArray: true,
    required: false
  })
  @IsEnum(ActivityType, { each: true })
  @IsArray()
  @IsOptional()
  activityTypes?: ActivityType[];

  @ApiProperty({
    enum: ContentType,
    description: 'Filter by content type',
    required: false
  })
  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @ApiProperty({
    description: 'Filter by content ID',
    example: '60d21b4667d0d8992e610c86',
    required: false
  })
  @IsMongoId()
  @IsOptional()
  contentId?: string;

  @ApiProperty({
    description: 'Start date for filtering',
    example: '2023-01-01T00:00:00.000Z',
    required: false
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @ApiProperty({
    description: 'End date for filtering',
    example: '2023-12-31T23:59:59.999Z',
    required: false
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    default: 1
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    default: 20
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
