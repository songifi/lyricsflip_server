import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsNumber, 
  IsDate, 
  IsObject, 
  Min, 
  Max,
  IsMongoId
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameRoundStatus } from './game-round.schema';

export class CreateGameRoundDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  roundId?: string;

  @ApiProperty({ description: 'Game Session ID' })
  @IsMongoId()
  sessionId: string;

  @ApiProperty({ description: 'Song ID for this round' })
  @IsMongoId()
  songId: string;

  @ApiPropertyOptional({ description: 'Round number within the session' })
  @IsNumber()
  @IsOptional()
  roundNumber?: number;

  @ApiPropertyOptional({ description: 'Round duration in seconds' })
  @IsNumber()
  @Min(10)
  @Max(300)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Round configuration' })
  @IsObject()
  @IsOptional()
  roundConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateGameRoundDto {
  @ApiPropertyOptional({ description: 'Song ID for this round' })
  @IsMongoId()
  @IsOptional()
  songId?: string;

  @ApiPropertyOptional({ enum: GameRoundStatus, description: 'Current status of the round' })
  @IsEnum(GameRoundStatus)
  @IsOptional()
  status?: GameRoundStatus;

  @ApiPropertyOptional({ description: 'Round start time' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startTime?: Date;

  @ApiPropertyOptional({ description: 'Round end time' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Round number within the session' })
  @IsNumber()
  @IsOptional()
  roundNumber?: number;

  @ApiPropertyOptional({ description: 'Round duration in seconds' })
  @IsNumber()
  @Min(10)
  @Max(300)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ description: 'Number of participants' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  participantCount?: number;

  @ApiPropertyOptional({ description: 'Number of correct answers' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  correctAnswerCount?: number;

  @ApiPropertyOptional({ description: 'Round configuration' })
  @IsObject()
  @IsOptional()
  roundConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class GameRoundQueryDto {
  @ApiPropertyOptional({ description: 'Game Session ID' })
  @IsMongoId()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({ enum: GameRoundStatus, description: 'Filter by status' })
  @IsEnum(GameRoundStatus)
  @IsOptional()
  status?: GameRoundStatus;

  @ApiPropertyOptional({ description: 'Filter by round number' })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  roundNumber?: number;

  @ApiPropertyOptional({ description: 'Filter by song ID' })
  @IsMongoId()
  @IsOptional()
  songId?: string;

  @ApiPropertyOptional({ description: 'Skip for pagination' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  skip?: number = 0;

  @ApiPropertyOptional({ description: 'Limit for pagination' })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 25;

  @ApiPropertyOptional({ description: 'Sort order (asc or desc)' })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';
}

export class StartRoundDto {
  @ApiPropertyOptional({ description: 'Custom start time (default: now)' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startTime?: Date;
}

export class EndRoundDto {
  @ApiPropertyOptional({ description: 'Custom end time (default: now)' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Number of participants' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  participantCount?: number;

  @ApiPropertyOptional({ description: 'Number of correct answers' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  correctAnswerCount?: number;

  @ApiPropertyOptional({ description: 'Round results and statistics' })
  @IsObject()
  @IsOptional()
  results?: Record<string, any>;
}
