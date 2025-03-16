import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { FollowStatus } from '../schemas/follow.schema';

export class FollowQueryDto {
  @ApiProperty({
    description: 'Filter by status',
    enum: FollowStatus,
    required: false,
    example: FollowStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(FollowStatus)
  status?: FollowStatus;

  @ApiProperty({
    description: 'Page number',
    required: false,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    required: false,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}