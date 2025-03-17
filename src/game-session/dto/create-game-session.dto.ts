import { IsNotEmpty, IsString, IsOptional, IsObject, IsArray } from 'class-validator';

export class CreateGameSessionDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  host: string;

  @IsOptional()
  @IsArray()
  players?: string[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
