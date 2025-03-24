import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { BlockRepository } from './block.repository';
import { BlockEventListeners } from './block-event.listeners';
import { ContentFilterService } from './content-filter.service';
import { BlockGuard } from './block.guard';
import { UserModule } from '../user/user.module';
import { CacheModule } from '../cache/cache.module';
import { NotificationModule } from '../notification/notification.module';
import { FollowModule } from '../follow/follow.module';
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlockRepository]),
    EventEmitterModule.forRoot(),
    UserModule,
    CacheModule,
    NotificationModule,
    FollowModule,
    RecommendationModule,
  ],
  controllers: [BlockController],
  providers: [
    BlockService,
    BlockEventListeners,
    ContentFilterService,
    BlockGuard,
  ],
  exports: [
    BlockService,
    ContentFilterService,
    BlockGuard,
  ]
})
export class BlockModule {}
