import { Type } from 'class-transformer';
import { IsOptional, IsPositive, IsInt, Max } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(1000) // Prevent excessive skips
  offset?: number = 0;
  
  // Optional sort parameter
  @IsOptional()
  sortBy?: string = 'createdAt';
  
  // Optional sort direction
  @IsOptional()
  sortDirection?: 'asc' | 'desc' = 'desc';
}
