import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GameRoundService } from './game-round.service';
import { GameRoundController } from './game-round.controller';
import { GameRound, GameRoundSchema } from './game-round.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameRound.name, schema: GameRoundSchema }
    ]),
    AuthModule
  ],
  controllers: [GameRoundController],
  providers: [GameRoundService],
  exports: [GameRoundService]
})
export class GameRoundModule {}
