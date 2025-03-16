// src/modules/block/dto/create-block.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBlockDto {
  @ApiProperty({
    description: 'ID of the user to block',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  blockedId: string;

  @ApiProperty({
    description: 'Optional reason for blocking the user',
    example: 'Inappropriate behavior',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// src/modules/block/dto/block-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsPositive, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BlockQueryDto {
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
