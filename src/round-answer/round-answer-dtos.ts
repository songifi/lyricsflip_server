import { IsString, IsUUID, IsOptional, IsEnum, IsBoolean, IsInt, Min, Max, IsObject, IsNotEmpty, MinLength, MaxLength, IsArray } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnswerStatus } from './round-answer.entity';
import { Sanitize } from '../common/decorators/sanitize.decorator';

export class CreateAnswerDto {
  @ApiProperty({ description: 'The ID of the game round' })
  @IsUUID()
  roundId: string;

  @ApiProperty({ description: 'The answer text provided by the user' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  @Sanitize()
  answerText: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the answer' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAnswerDto {
  @ApiProperty({ description: 'The updated answer text' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  @Sanitize()
  answerText: string;

  @ApiPropertyOptional({ description: 'Reason for updating the answer' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Sanitize()
  reason?: string;
}

export class ValidateAnswerDto {
  @ApiProperty({ description: 'The answer status after validation', enum: AnswerStatus })
  @IsEnum(AnswerStatus)
  status: AnswerStatus;

  @ApiPropertyOptional({ description: 'Whether the answer is correct' })
  @IsBoolean()
  isCorrect: boolean;

  @ApiPropertyOptional({ description: 'Score awarded for the answer' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiPropertyOptional({ description: 'Validation results details' })
  @IsObject()
  @IsOptional()
  validationResults?: Record<string, any>;
}

export class AnswerFilterDto {
  @ApiPropertyOptional({ description: 'Filter by round ID' })
  @IsUUID()
  @IsOptional()
  roundId?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by answer status', enum: AnswerStatus })
  @IsEnum(AnswerStatus)
  @IsOptional()
  status?: AnswerStatus;

  @ApiPropertyOptional({ description: 'Filter by correctness' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isCorrect?: boolean;

  @ApiPropertyOptional({ description: 'Filter answers with score greater than or equal to this value' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Filter answers with score less than or equal to this value' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Number of records to return' })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of records to skip' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'] })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Sort by field', enum: ['createdAt', 'score', 'updatedAt'] })
  @IsEnum(['createdAt', 'score', 'updatedAt'])
  @IsOptional()
  sortBy?: 'createdAt' | 'score' | 'updatedAt' = 'createdAt';
}

export class BulkValidateAnswersDto {
  @ApiProperty({ description: 'Array of answer IDs to validate' })
  @IsArray()
  @IsUUID(undefined, { each: true })
  answerIds: string[];

  @ApiProperty({ description: 'Validation status to apply', enum: AnswerStatus })
  @IsEnum(AnswerStatus)
  status: AnswerStatus;

  @ApiPropertyOptional({ description: 'Whether answers are correct' })
  @IsBoolean()
  @IsOptional()
  isCorrect?: boolean;

  @ApiPropertyOptional({ description: 'Score to apply to all answers' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;
}

export class AnswerStatisticsDto {
  @ApiProperty({ description: 'The ID of the game round' })
  @IsUUID()
  roundId: string;

  @ApiPropertyOptional({ description: 'Group statistics by user' })
  @IsBoolean()
  @IsOptional()
  groupByUser?: boolean;

  @ApiPropertyOptional({ description: 'Include detailed answer data' })
  @IsBoolean()
  @IsOptional()
  includeDetails?: boolean;
}
