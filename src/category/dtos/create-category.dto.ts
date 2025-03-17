
// src/category/dto/create-category.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsArray } from 'class-validator';
import { CategoryType } from 'src/schemas/category.schema';


export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['genre', 'decade', 'tag'])
  @IsNotEmpty()
  type: CategoryType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSystem?: boolean;

  @IsString()
  @IsOptional()
  icon?: string;
  
  @IsArray()
  @IsOptional()
  relatedCategories?: string[];
}
