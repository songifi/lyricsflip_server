// File: src/modules/player/dto/player-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PlayerStatus } from '../schemas/player.schema';

export class UserInfo {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  id: string;

  @ApiProperty({ example: 'JohnDoe' })
  username: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;
}

export class AnswerResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c87' })
  questionId: string;

  @ApiProperty({ example: 'option_2' })
  value: any;

  @ApiProperty({ example: true })
  isCorrect: boolean;

  @ApiProperty({ example: 5230 })
  timeToAnswer: number;

  @ApiProperty({ example: 100 })
  pointsEarned: number;

  @ApiProperty({ example: '2023-05-01T12:00:00.000Z' })
  submittedAt: Date;
}

export class PlayerResponseDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c86' })
  id: string;

  @ApiProperty({ example: '60d21b4667d0d8992e610c85' })
  userId: string;

  @ApiProperty({ type: UserInfo })
  user?: UserInfo;

  @ApiProperty({ example: '60d21b4667d0d8992e610c90' })
  sessionId: string;

  @ApiProperty({ enum: PlayerStatus, example: PlayerStatus.ACTIVE })
  status: PlayerStatus;

  @ApiProperty({ example: '2023-05-01T12:00:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ example: 350 })
  score: number;

  @ApiProperty({ example: 2 })
  position: number;

  @ApiProperty({ example: 180 })
  activeTime: number;

  @ApiProperty({ example: '2023-05-01T12:10:00.000Z' })
  lastActive: Date;

  @ApiProperty({ type: [AnswerResponseDto] })
  answers: AnswerResponseDto[];

  @ApiProperty({ example: 3 })
  correctAnswers: number;

  @ApiProperty({
    example: { avatar: 'rocket', color: '#ff5500' },
    type: 'object'
  })
  metadata: Record<string, any>;

  @ApiProperty({ example: '2023-05-01T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-05-01T12:15:00.000Z' })
  updatedAt: Date;
}