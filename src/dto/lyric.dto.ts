import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  IsBoolean,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import { Decade, Genre } from 'src/enum/lyric.enum';

export class CreatelyricDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  artist!: string;

  @IsString()
  @IsOptional()
  album?: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  @IsOptional()
  releaseYear?: number;

  @IsArray()
  @IsEnum({ Enum: Genre })
  @IsOptional()
  @IsMongoId({ each: true })
  genres?: string[];

  @ValidateNested()
  @Type(() => CreatelyricDto)
  @IsOptional()
  lyrics?: CreatelyricDto;

  @IsArray()
  @IsOptional()
  @IsEnum({ Enum: Decade })
  @IsMongoId({ each: true })
  decades?: string[];

  @IsArray()
  @IsOptional()
  @IsMongoId({ each: true })
  tags?: string[];
}

export class QuerylyricDto extends PartialType(CreatelyricDto) {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number.parseInt(value))
  limit?: number = 10;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => Number.parseInt(value))
  skip?: number = 0;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  withLyrics?: boolean = false;
}

export class UpdatelyricDto extends PartialType(CreatelyricDto) {}

//dto for partial lyric extraction
export class LyricExtractionOptionsDto {
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20)
  minLines?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(50)
  maxLines?: number;

  @IsBoolean()
  @IsOptional()
  includeChorus?: boolean;
}
 