// src/modules/activity/dto/record-activity.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsObject, IsBoolean, IsOptional } from 'class-validator';
import { ActivityType, ActivityPrivacy, ActivityTarget } from '../schemas/activity.schema';

export class RecordActivityDto {
  @ApiProperty({
    description: 'User ID who performed the activity',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Type of activity',
    enum: ActivityType,
    example: ActivityType.LIKE,
  })
  @IsNotEmpty()
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiProperty({
    description: 'Target of the activity',
    example: { type: 'song', id: '60d21b4667d0d8992e610c86', details: { title: 'Song Name' } },
  })
  @IsNotEmpty()
  @IsObject()
  target: ActivityTarget;

  @ApiProperty({
    description: 'Additional metadata for the activity',
    required: false,
    example: { playlistName: 'My Playlist' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Privacy level for the activity',
    enum: ActivityPrivacy,
    default: ActivityPrivacy.PUBLIC,
    required: false,
  })
  @IsOptional()
  @IsEnum(ActivityPrivacy)
  privacy?: ActivityPrivacy;

  @ApiProperty({
    description: 'Whether to group this activity with similar ones',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  groupWithSimilar?: boolean;
}

// src/modules/activity/dto/activity-feed.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsArray, IsString, IsDateString, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '../schemas/activity.schema';

export class ActivityFeedDto {
  @ApiProperty({
    description: 'Page number',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: 'Number of activities per page',
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiProperty({
    description: 'Filter by activity types',
    required: false,
    isArray: true,
    enum: ActivityType,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ActivityType, { each: true })
  types?: ActivityType[];

  @ApiProperty({
    description: 'Filter activities from this date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    description: 'Filter activities until this date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({
    description: 'Show only activities from followed users',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  followingOnly?: boolean = false;

  @ApiProperty({
    description: 'Exclude user\'s own activities',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  excludeOwn?: boolean = false;
  
  @ApiProperty({
    description: 'Skip cache and fetch fresh data',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  skipCache?: boolean = false;
}

// src/modules/activity/dto/activity-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

class ActivityUserDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;
  
  @ApiProperty({ example: 'johndoe' })
  username: string;
  
  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;
}

class ActivityTargetDto {
  @ApiProperty({ example: 'song' })
  type: string;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;
  
  @ApiProperty({ 
    example: { title: 'Song Name', artist: 'Artist Name' }, 
    required: false 
  })
  details?: Record<string, any>;
}

export class ActivityResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  id: string;
  
  @ApiProperty()
  user: ActivityUserDto;
  
  @ApiProperty({ enum: ActivityType, example: ActivityType.LIKE })
  type: ActivityType;
  
  @ApiProperty()
  target: ActivityTargetDto;
  
  @ApiProperty({ example: { playlistName: 'My Playlist' }, required: false })
  metadata?: Record<string, any>;
  
  @ApiProperty({ enum: ActivityPrivacy, example: ActivityPrivacy.PUBLIC })
  privacy: ActivityPrivacy;
  
  @ApiProperty({ example: '2023-06-24T12:34:56.789Z' })
  createdAt: Date;
  
  @ApiProperty({ example: '60d21b4667d0d8992e610c87', required: false })
  groupKey?: string;
}

export class ActivityFeedResponseDto {
  @ApiProperty({ type: [ActivityResponseDto] })
  activities: ActivityResponseDto[];
  
  @ApiProperty({ example: 150 })
  total: number;
  
  @ApiProperty({ example: true })
  hasMore: boolean;
}
