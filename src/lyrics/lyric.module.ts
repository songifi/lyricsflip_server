import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { lyricService } from './lyric.service';
import { lyricController } from './lyric.controller';
import { lyric, lyricschema } from 'src/schemas/lyric.schema';
import { LyricsManagementService } from './lyric-management.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: lyric.name, schema: lyricschema }]),
  ],
  controllers: [lyricController],
  providers: [lyricService, LyricsManagementService],
  exports: [lyricService, LyricsManagementService]

})
export class LyricModule {}
