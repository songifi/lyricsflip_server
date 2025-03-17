// src/modules/share/dto/create-share.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { ContentType, TargetType } from '../schemas/share.schema';

export class CreateShareDto {
  @ApiProperty({
    description: 'Type of content being shared',
    enum: ContentType,
    example: ContentType.SONG,
  })
  @IsNotEmpty()
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({
    description: 'ID of the content being shared',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  contentId: string;

  @ApiProperty({
    description: 'Type of target where content is shared',
    enum: TargetType,
    example: TargetType.INTERNAL,
  })
  @IsNotEmpty()
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiProperty({
    description: 'ID of the target user (required only for internal shares)',
    example: '60d21b4667d0d8992e610c86',
    required: false,
  })
  @ValidateIf(o => o.targetType === TargetType.INTERNAL)
  @IsNotEmpty({ message: 'Target ID is required for internal shares' })
  @IsMongoId()
  targetId?: string;

  @ApiProperty({
    description: 'Optional message accompanying the share',
    example: 'Check out this awesome song!',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiProperty({
    description: 'Additional metadata for the share',
    required: false,
    type: 'object',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

