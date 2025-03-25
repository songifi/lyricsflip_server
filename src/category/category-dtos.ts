import { IsEnum, IsString, IsOptional, IsArray, IsUUID, IsBoolean, IsNotEmpty, MaxLength, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryType } from './category.entity';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'The name of the category',
    example: 'Rock'
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'The type of the category',
    enum: CategoryType,
    example: CategoryType.GENRE
  })
  @IsEnum(CategoryType)
  type: CategoryType;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'Rock music originated in the United States in the late 1940s and early 1950s'
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the category',
    example: { originCountry: 'USA', popularInstruments: ['guitar', 'drums'] }
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags associated with the category',
    example: ['electric', 'guitar', 'loud']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(20)
  tags?: string[];
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'The name of the category',
    example: 'Rock'
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'The type of the category',
    enum: CategoryType,
    example: CategoryType.GENRE
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Description of the category',
    example: 'Rock music originated in the United States in the late 1940s and early 1950s'
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the category',
    example: { originCountry: 'USA', popularInstruments: ['guitar', 'drums'] }
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags associated with the category',
    example: ['electric', 'guitar', 'loud']
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the category is active',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddSongToCategoryDto {
  @ApiProperty({
    description: 'ID of the song to add to the category',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  songId: string;
}

export class CategoryFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by category type',
    enum: CategoryType,
    example: CategoryType.GENRE
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma separated)',
    example: 'guitar,electric'
  })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Search in name and description',
    example: 'rock'
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Only return active categories',
    example: true
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CategoryStatsDto {
  @ApiProperty({
    description: 'Total number of songs in the category',
    example: 250
  })
  songCount: number;

  @ApiProperty({
    description: 'Total number of listens for all songs in the category',
    example: 1500000
  })
  totalListens: number;

  @ApiProperty({
    description: 'Total number of likes for all songs in the category',
    example: 75000
  })
  totalLikes: number;
}