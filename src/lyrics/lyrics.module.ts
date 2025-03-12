import { Module } from '@nestjs/common';
import { LyricsController } from './lyrics.controller';

@Module({
  controllers: [LyricsController],
})
export class LyricsModule {}
