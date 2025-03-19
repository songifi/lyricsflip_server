import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-redis-store';

import { SocialGraphService } from './social-graph.service';
import { SocialGraphController } from './social-graph.controller';
import { SocialGraphProcessor } from './social-graph.processor';

import { User, UserSchema } from '../user/schemas/user.schema';
import { Follow, FollowSchema } from '../follow/schemas/follow.schema';
import { Like, LikeSchema } from '../like/schemas/like.schema';
import { Comment, CommentSchema } from '../comment/schemas/comment.schema';
import { Share, ShareSchema } from '../share/schemas/share.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Share.name, schema: ShareSchema },
    ]),
    BullModule.registerQueue({
      name: 'social-graph',
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      ttl: 3600, // 1 hour in seconds
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [SocialGraphController],
  providers: [SocialGraphService, SocialGraphProcessor],
  exports: [SocialGraphService],
})
export class SocialGraphModule {}
