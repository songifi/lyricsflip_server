import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SongService } from './song.service';
import { SongController } from './song.controller';
import { Song, SongSchema } from 'src/schemas/song.chema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Song.name, schema: SongSchema }])],
  controllers: [SongController],
  providers: [SongService],
  exports: [SongService]
})
export class SongModule {}
