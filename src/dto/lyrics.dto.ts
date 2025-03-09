import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLyricsDto {
  @ApiProperty({
    description: 'The title of the song',
    example: 'Bohemian Rhapsody'
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    description: 'The artist name',
    example: 'Queen'
  })
  @IsString()
  @IsNotEmpty()
  artist!: string;

  @ApiProperty({
    description: 'The lyrics content',
    example: 'Is this the real life? Is this just fantasy?'
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    description: 'Genre of the song',
    example: 'Rock',
    required: false
  })
  @IsString()
  @IsOptional()
  genre?: string;

  constructor(partial: Partial<CreateLyricsDto> = {}) {
    Object.assign(this, partial);
  }
}

export class UpdateLyricsDto {
  @ApiProperty({
    description: 'The title of the song',
    example: 'Bohemian Rhapsody',
    required: false
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'The artist name',
    example: 'Queen',
    required: false
  })
  @IsString()
  @IsOptional()
  artist?: string;

  @ApiProperty({
    description: 'The lyrics content',
    example: 'Is this the real life? Is this just fantasy?',
    required: false
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({
    description: 'Genre of the song',
    example: 'Rock',
    required: false
  })
  @IsString()
  @IsOptional()
  genre?: string;

  constructor(partial: Partial<UpdateLyricsDto> = {}) {
    Object.assign(this, partial);
  }
} 