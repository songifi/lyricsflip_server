// src/privacy/privacy.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { PrivacyService } from './privacy.service';
import { PrivacyController } from './privacy.controller';
import { PrivacySettings } from './entities/privacy-settings.entity';
import { FollowRequest } from './entities/follow-request.entity';
import { User } from '../user/entities/user.entity';
import { PrivacyGuard } from './guards/privacy.guard';
import { PrivacyEventsListener } from './listeners/privacy-events.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([PrivacySettings, FollowRequest, User]),
    CacheModule.register({
      ttl: 300, // 5 minutes in seconds
      max: 100, // maximum number of items in cache
    }),
    EventEmitterModule.forRoot()
  ],
  controllers: [PrivacyController],
  providers: [
    PrivacyService,
    PrivacyEventsListener,
    {
      provide: APP_GUARD,
      useClass: PrivacyGuard,
    }
  ],
  exports: [PrivacyService]
})
export class PrivacyModule {}
