// File: src/modules/player/dto/create-player.dto.ts
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlayerStatus } from '../schemas/player.schema';

export class CreatePlayerDto {
  @ApiProperty({
    description: 'Game session ID',
    example: '60d21b4667d0d8992e610c85'
  })
  @IsMongoId()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    enum: PlayerStatus,
    description: 'Initial player status',
    example: PlayerStatus.JOINED,
    default: PlayerStatus.JOINED,
    required: false
  })
  @IsEnum(PlayerStatus)
  @IsOptional()
  status?: PlayerStatus;

  @ApiProperty({
    description: 'Custom metadata for the player',
    example: { avatar: 'rocket', color: '#ff5500' },
    required: false,
    type: 'object'
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}