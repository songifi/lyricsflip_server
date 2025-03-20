// src/modules/round-answer/dto/submit-answer.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsMongoId, IsObject, IsOptional } from 'class-validator';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'ID of the game round',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  roundId: string;

  @ApiProperty({
    description: 'Answer text submitted by the player',
    example: 'Yellow Submarine',
  })
  @IsNotEmpty()
  @IsString()
  answer: string;

  @ApiProperty({
    description: 'Optional additional metadata for the answer',
    example: { confidence: 'high', selectedOptionId: '123' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// src/modules/round-answer/dto/update-answer-score.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class UpdateAnswerScoreDto {
  @ApiProperty({
    description: 'Score awarded for the answer',
    example: 100,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  score: number;

  @ApiProperty({
    description: 'Whether the answer is correct',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isCorrect: boolean;
}

// src/modules/round-answer/dto/get-answers-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetAnswersQueryDto {
  @ApiProperty({
    description: 'Filter by correct answers only',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  correctOnly?: boolean;

  @ApiProperty({
    description: 'Filter by player ID',
    required: false,
    example: '60d21b4667d0d8992e610c86',
  })
  @IsOptional()
  @IsMongoId()
  playerId?: string;
}

// src/modules/round-answer/dto/answer-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PlayerDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;

  @ApiProperty({ example: 'player1' })
  username: string;
}

export class AnswerResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  id: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  roundId: string;

  @ApiProperty()
  player: PlayerDto;

  @ApiProperty({ example: 'Yellow Submarine' })
  answer: string;

  @ApiProperty({ example: '2023-06-24T12:34:56.789Z' })
  submittedAt: Date;

  @ApiProperty({ example: 100 })
  score: number;

  @ApiProperty({ example: true })
  isCorrect: boolean;

  @ApiProperty({ example: 1250 })
  responseTimeMs: number;

  @ApiProperty({ 
    example: { confidence: 'high', selectedOptionId: '123' },
    required: false,
  })
  metadata?: Record<string, any>;
}
