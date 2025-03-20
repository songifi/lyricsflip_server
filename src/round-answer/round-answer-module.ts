// src/modules/round-answer/round-answer.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoundAnswerController } from './round-answer.controller';
import { RoundAnswerService } from './round-answer.service';
import { RoundAnswer, RoundAnswerSchema } from './schemas/round-answer.schema';
import { GameRound, GameRoundSchema } from '../game-round/schemas/game-round.schema';
import { Player, PlayerSchema } from '../player/schemas/player.schema';
import { PlayerModule } from '../player/player.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoundAnswer.name, schema: RoundAnswerSchema },
      { name: GameRound.name, schema: GameRoundSchema },
      { name: Player.name, schema: PlayerSchema },
    ]),
    PlayerModule,
  ],
  controllers: [RoundAnswerController],
  providers: [RoundAnswerService],
  exports: [RoundAnswerService],
})
export class RoundAnswerModule {}
