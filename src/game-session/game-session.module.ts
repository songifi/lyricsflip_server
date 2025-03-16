import { Module } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { GameSessionController } from './game-session.controller';

@Module({
  controllers: [GameSessionController],
  providers: [GameSessionService],
})
export class GameSessionModule {}
