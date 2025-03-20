// src/modules/player/player.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';

import { PlayerService } from './player.service';
import { PlayerGateway } from './player.gateway';
import { Player, PlayerSchema } from './schemas/player.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { GameSession, GameSessionSchema } from '../game-session/schemas/game-session.schema';
import { WsJwtStrategy } from '../auth/strategies/ws-jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: User.name, schema: UserSchema },
      { name: GameSession.name, schema: GameSessionSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
    }),
    EventEmitterModule.forRoot(),
  ],
  providers: [PlayerService, PlayerGateway, WsJwtStrategy],
  exports: [PlayerService],
})
export class PlayerModule {}
