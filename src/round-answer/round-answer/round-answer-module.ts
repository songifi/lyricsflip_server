import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { RoundAnswerService } from './round-answer.service';
import { RoundAnswerController } from './round-answer.controller';
import { RoundAnswerRepository } from './round-answer.repository';
import { RoundAnswerEventListeners } from './round-answer-event.listeners';
import { GameRoundModule } from '../game-round/game-round.module';
import { UserModule } from '../user/user.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationModule } from '../notification/notification.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RateLimiterModule } from '../common/modules/rate-limiter.module';
import { AnswerValidationModule } from '../answer-validation/answer-validation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoundAnswerRepository]),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10
    }),
    EventEmitterModule.forRoot(),
    GameRoundModule,
    UserModule,
    AuditLogModule,
    NotificationModule,
    WebsocketModule,
    RateLimiterModule,
    AnswerValidationModule
  ],
  controllers: [RoundAnswerController],
  providers: [
    RoundAnswerService,
    RoundAnswerEventListeners
  ],
  exports: [RoundAnswerService]
})
export class RoundAnswerModule {}
