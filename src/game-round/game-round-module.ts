import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { GameRoundService } from './game-round.service';
import { GameRoundController } from './game-round.controller';
import { GameRoundRepository } from './game-round.repository';
import { SongModule } from '../song/song.module';
import { LyricSelectionModule } from '../lyric-selection/lyric-selection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameRoundRepository]),
    ScheduleModule.forRoot(), // For cron jobs
    EventEmitterModule.forRoot(), // For event emission
    SongModule,
    LyricSelectionModule,
  ],
  controllers: [GameRoundController],
  providers: [GameRoundService],
  exports: [GameRoundService],
})
export class GameRoundModule {}
