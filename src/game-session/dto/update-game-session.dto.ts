import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateGameSessionDto {
    @IsOptional()
    @IsString()
    name?: string;
  
    @IsOptional()
    @IsArray()
    players?: string[];
  
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
  }