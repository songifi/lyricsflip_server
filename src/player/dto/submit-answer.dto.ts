// File: src/modules/player/dto/submit-answer.dto.ts
import { IsMongoId, IsNotEmpty, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnswerDto {
  @ApiProperty({
    description: 'Question ID',
    example: '60d21b4667d0d8992e610c87'
  })
  @IsMongoId()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({
    description: 'Answer value (can be any type)',
    example: 'option_2'
  })
  @IsNotEmpty()
  value: any;

  @ApiProperty({
    description: 'Whether the answer is correct',
    example: true
  })
  @IsBoolean()
  @IsNotEmpty()
  isCorrect: boolean;

  @ApiProperty({
    description: 'Time taken to answer in milliseconds',
    example: 5230
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  timeToAnswer: number;

  @ApiProperty({
    description: 'Points earned for this answer',
    example: 100,
    required: false
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsEarned?: number;
}