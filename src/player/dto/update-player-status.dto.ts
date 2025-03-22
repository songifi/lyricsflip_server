// File: src/modules/player/dto/update-player-status.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PlayerStatus } from '../schemas/player.schema';

export class UpdatePlayerStatusDto {
  @ApiProperty({
    enum: PlayerStatus,
    description: 'New player status',
    example: PlayerStatus.READY
  })
  @IsEnum(PlayerStatus)
  @IsNotEmpty()
  status: PlayerStatus;
}