// src/modules/share/dto/query-share.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType, TargetType } from '../schemas/share.schema';

export class QueryShareDto {
  @ApiProperty({
    description: 'Filter shares by content type',
    enum: ContentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;

  @ApiProperty({
    description: 'Filter shares by content ID',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  contentId?: string;

  @ApiProperty({
    description: 'Filter shares by target type',
    enum: TargetType,
    required: false,
  })
  @IsOptional()
  @IsEnum(TargetType)
  targetType?: TargetType;

  @ApiProperty({
    description: 'Filter shares by user ID',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiProperty({
    description: 'Page number (starts from 1)',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  limit?: number = 20;
}
