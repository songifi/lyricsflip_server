import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum, ValidateNested, IsBoolean } from "class-validator"
import { Transform, Type } from "class-transformer"
import { Decade, Genre } from "src/enum/song.enum"
import { CreateLyricsDto } from "./lyrics.dto"
import { PartialType } from "@nestjs/swagger"

// Create Song Dto
export class CreateSongDto {

  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  artist!: string

  @IsString()
  @IsOptional()
  album?: string

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  @IsOptional()
  releaseYear?: number

  @IsEnum({Enum: Genre})
  @IsOptional()
  genre?: string

  @ValidateNested()
  @Type(() => CreateLyricsDto)
  @IsOptional()
  lyrics?: CreateLyricsDto

  @IsOptional()
  @IsEnum({Enum: Decade})
  decade?: string
}

// Update Song Dto
export class UpdateSongDto extends PartialType(CreateSongDto) {}

// Query Song Dto
export class QuerySongDto extends PartialType(CreateSongDto) {

    @IsOptional()
    @IsString()
    search?: string
  
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => Number.parseInt(value))
    limit?: number = 10
  
    @IsOptional()
    @IsInt()
    @Min(0)
    @Transform(({ value }) => Number.parseInt(value))
    skip?: number = 0
  
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === "true")
    withLyrics?: boolean = false
  }
  