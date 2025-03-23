import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '@nestjs/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';
import { FollowRepository } from './follow.repository';
import { FollowRequestRepository } from './follow-request.repository';
import { FollowCacheService } from './follow-cache.service';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { FollowEventListeners } from './follow-event.listeners';

import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowRepository, FollowRequestRepository]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get('THROTTLE_TTL', 60),
        limit: configService.get('THROTTLE_LIMIT', 10),
      }),
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        url: configService.get('REDIS_URL'),
      }),
    }),
    EventEmitterModule.forRoot(),
    UserModule,
    NotificationModule,
  ],
  controllers: [FollowController],
  providers: [
    FollowService,
    FollowCacheService,
    RateLimiterService,
    FollowEventListeners,
  ],
  exports: [FollowService],
})
export class FollowModule {}
