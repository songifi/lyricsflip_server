import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBlockDto {
  @ApiProperty({ description: 'ID of the user to block' })
  @IsUUID()
  blockedId: string;

  @ApiPropertyOptional({ description: 'Reason for blocking the user' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the block' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BlockedUsersQueryDto {
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

export class BlockStatusDto {
  @ApiProperty({ description: 'Whether the current user has blocked the target user' })
  hasBlocked: boolean;

  @ApiProperty({ description: 'Whether the current user is blocked by the target user' })
  isBlockedBy: boolean;
}

export class BlockImpactDto {
  @ApiProperty({ description: 'User IDs that should be excluded from results' })
  excludeUserIds: string[];

  @ApiProperty({ description: 'User IDs that the current user has blocked' })
  blockedByMe: string[];

  @ApiProperty({ description: 'User IDs that have blocked the current user' })
  blockedMe: string[];
}
