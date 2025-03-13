import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum, ValidateNested, IsBoolean } from "class-validator"
import { Type } from "class-transformer"
import { Decade, Genre } from "src/enum/song.enum"
import { CreateLyricsDto } from "./lyrics.dto"

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