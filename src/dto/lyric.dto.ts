import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsEnum, ValidateNested, IsBoolean } from "class-validator"
import { Transform } from "class-transformer"
import { Type } from "class-transformer"
import { PartialType } from "@nestjs/swagger"
import { Decade, Genre } from "src/enum/lyric.enum"

export class CreatelyricDto {

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
  @Type(() => CreatelyricDto)
  @IsOptional()
  lyrics?: CreatelyricDto

  @IsOptional()
  @IsEnum({Enum: Decade})
  decade?: string
}

export class QuerylyricDto extends PartialType(CreatelyricDto) {

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

export class UpdatelyricDto extends PartialType(CreatelyricDto) {}
