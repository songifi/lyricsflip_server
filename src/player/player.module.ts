// File: src/modules/player/player.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PlayerController } from './controllers/player.controller';
import { PlayerService } from './services/player.service';
import { Player, PlayerSchema } from './schemas/player.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema }
    ]),
    EventEmitterModule.forRoot()
  ],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService]
})
export class PlayerModule {}