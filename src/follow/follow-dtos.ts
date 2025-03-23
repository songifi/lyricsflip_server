import { IsString, IsUUID, IsOptional, IsEnum, IsInt, Min, Max, ValidateNested, 
  IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowRequestStatus } from './follow-request.entity';

export class FollowUserDto {
  @ApiProperty({ description: 'ID of the user to follow' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Optional note to include with follow request' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UnfollowUserDto {
  @ApiProperty({ description: 'ID of the user to unfollow' })
  @IsUUID()
  userId: string;
}

export class FollowRequestResponseDto {
  @ApiProperty({ description: 'ID of the follow request to respond to' })
  @IsUUID()
  requestId: string;

  @ApiProperty({ description: 'Whether to approve or reject the follow request' })
  @IsBoolean()
  approve: boolean;

  @ApiPropertyOptional({ description: 'Optional response note' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class FollowListQueryDto {
  @ApiPropertyOptional({ description: 'Number of items to return per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Page number (zero-based)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  page?: number = 0;

  @ApiPropertyOptional({ description: 'Search by username' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class PendingRequestsQueryDto extends FollowListQueryDto {
  @ApiPropertyOptional({ description: 'Status of follow requests to retrieve', enum: FollowRequestStatus })
  @IsEnum(FollowRequestStatus)
  @IsOptional()
  status?: FollowRequestStatus = FollowRequestStatus.PENDING;
}

export class FollowSuggestionsQueryDto {
  @ApiPropertyOptional({ description: 'Number of suggestions to return', default: 10 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Include mutual connections in results', default: true })
  @IsBoolean()
  @IsOptional()
  includeMutual?: boolean = true;

  @ApiPropertyOptional({ description: 'Include popular users in results', default: true })
  @IsBoolean()
  @IsOptional()
  includePopular?: boolean = true;

  @ApiPropertyOptional({ description: 'Include users with similar interests', default: true })
  @IsBoolean()
  @IsOptional()
  includeSimilarInterests?: boolean = true;
}

export class FollowCountDto {
  @ApiProperty({ description: 'Count of followers' })
  followerCount: number;
  
  @ApiProperty({ description: 'Count of following' })
  followingCount: number;
}
