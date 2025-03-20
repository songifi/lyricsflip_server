// src/modules/player/dto/player-join.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class PlayerJoinDto {
  @ApiProperty({
    description: 'Whether the player is joining as a spectator',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isSpectator?: boolean = false;
}

// src/modules/player/dto/player-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class PlayerReadyDto {
  @ApiProperty({
    description: 'Whether the player is ready to start the game',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isReady: boolean;
}

// src/modules/player/dto/kick-player.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class KickPlayerDto {
  @ApiProperty({
    description: 'ID of the player to kick from the session',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsMongoId()
  playerToKickId: string;
}
