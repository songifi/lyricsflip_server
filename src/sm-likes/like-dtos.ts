// src/likes/dto/create-like.dto.ts
import { IsUUID, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LikeableType } from '../enums/likeable-type.enum';

export class CreateLikeDto {
  @ApiProperty({
    description: 'ID of the content to like',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  likeableId: string;

  @ApiProperty({
    description: 'Type of content to like',
    enum: LikeableType,
    example: LikeableType.SONG,
  })
  @IsEnum(LikeableType)
  likeableType: LikeableType;

  @ApiPropertyOptional({
    description: 'Whether the like should be anonymous',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

// src/likes/dto/like-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LikeableType } from '../enums/likeable-type.enum';

export class LikeResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the like',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the user who liked the content',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Username of the user who liked the content',
    example: 'johndoe',
  })
  username?: string;

  @ApiProperty({
    description: 'ID of the content that was liked',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  likeableId: string;

  @ApiProperty({
    description: 'Type of content that was liked',
    enum: LikeableType,
    example: LikeableType.SONG,
  })
  likeableType: LikeableType;

  @ApiProperty({
    description: 'Whether the like is anonymous',
    example: false,
  })
  isAnonymous: boolean;

  @ApiProperty({
    description: 'When the like was created',
    example: '2023-04-15T10:30:00Z',
  })
  createdAt: Date;
}

// src/likes/dto/like-filter.dto.ts
import { IsUUID, IsEnum, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LikeableType } from '../enums/likeable-type.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class LikeFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter likes by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter likes by content ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  likeableId?: string;

  @ApiPropertyOptional({
    description: 'Filter likes by content type',
    enum: LikeableType,
    example: LikeableType.SONG,
  })
  @IsEnum(LikeableType)
  @IsOptional()
  likeableType?: LikeableType;

  @ApiPropertyOptional({
    description: 'Filter likes created from this date',
    example: '2023-04-01T00:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  fromDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter likes created until this date',
    example: '2023-04-30T23:59:59Z',
  })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  toDate?: Date;
}

// src/likes/dto/like-stats.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LikeableType } from '../enums/likeable-type.enum';

export class LikeStatsDto {
  @ApiProperty({
    description: 'Total number of likes',
    example: 1250,
  })
  totalCount: number;

  @ApiPropertyOptional({
    description: 'ID of the content the stats are for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  likeableId?: string;

  @ApiPropertyOptional({
    description: 'Type of the content the stats are for',
    enum: LikeableType,
    example: LikeableType.SONG,
  })
  likeableType?: LikeableType;

  @ApiPropertyOptional({
    description: 'Number of likes in the last 24 hours',
    example: 42,
  })
  last24Hours?: number;

  @ApiPropertyOptional({
    description: 'Number of likes in the last 7 days',
    example: 156,
  })
  lastWeek?: number;

  @ApiPropertyOptional({
    description: 'Number of likes in the last 30 days',
    example: 531,
  })
  lastMonth?: number;

  @ApiPropertyOptional({
    description: 'Like growth percentage compared to previous period',
    example: 12.5,
  })
  growthPercentage?: number;
}

// src/likes/dto/check-like-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CheckLikeResponseDto {
  @ApiProperty({
    description: 'Whether the user has liked the content',
    example: true,
  })
  liked: boolean;

  @ApiProperty({
    description: 'Total number of likes for the content',
    example: 1250,
  })
  likesCount: number;
}

// src/common/dto/pagination.dto.ts
import { IsInt, Min, Max, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of items to return per page',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Number of items to skip (for pagination)',
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Field to sort results by',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction (asc or desc)',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortDirection?: 'asc' | 'desc' = 'desc';
}
