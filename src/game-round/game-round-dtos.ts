import { IsString, IsOptional, IsEnum, IsUUID, IsInt, IsBoolean, IsDate, Min, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { GameRoundStatus } from './game-round.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGameRoundDto {
  @ApiProperty({ description: 'Title of the game round' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Description of the game round' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'ID of the song for this round' })
  @IsUUID()
  songId: string;

  @ApiPropertyOptional({ description: 'Maximum number of participants allowed' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Scheduled start time for the round' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledStartTime?: Date;

  @ApiPropertyOptional({ description: 'Duration of the round in seconds' })
  @IsInt()
  @Min(30) // Minimum 30 seconds
  @IsOptional()
  roundDuration?: number;

  @ApiPropertyOptional({ description: 'Whether the round is public or private' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata for the round' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateGameRoundDto {
  @ApiPropertyOptional({ description: 'Title of the game round' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Description of the game round' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'ID of the song for this round' })
  @IsUUID()
  @IsOptional()
  songId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of participants allowed' })
  @IsInt()
  @Min(0)
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Scheduled start time for the round' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledStartTime?: Date;

  @ApiPropertyOptional({ description: 'Duration of the round in seconds' })
  @IsInt()
  @Min(30) // Minimum 30 seconds
  @IsOptional()
  roundDuration?: number;

  @ApiPropertyOptional({ description: 'Whether the round is public or private' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata for the round' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class GameRoundFilterDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: GameRoundStatus })
  @IsEnum(GameRoundStatus)
  @IsOptional()
  status?: GameRoundStatus;

  @ApiPropertyOptional({ description: 'Filter by creator ID' })
  @IsUUID()
  @IsOptional()
  creatorId?: string;

  @ApiPropertyOptional({ description: 'Filter by song ID' })
  @IsUUID()
  @IsOptional()
  songId?: string;

  @ApiPropertyOptional({ description: 'Only include public rounds' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Results per page' })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number = 0;
}

export class ChangeGameRoundStatusDto {
  @ApiProperty({ description: 'New status for the game round', enum: GameRoundStatus })
  @IsEnum(GameRoundStatus)
  status: GameRoundStatus;
}
