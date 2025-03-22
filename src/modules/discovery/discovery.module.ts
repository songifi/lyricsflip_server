import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ContentDiscoveryService } from './services/content-discovery.service';
import { ScoringService } from './services/scoring.service';
import { RecommendationCacheService } from './services/recommendation-cache.service';
import { ABTestingService } from './services/ab-testing.service';
import { ContentDiscoveryController } from './controllers/content-discovery.controller';
import { Content, ContentSchema } from '../content/schemas/content.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Interaction, InteractionSchema } from '../interaction/schemas/interaction.schema';
import { Connection, ConnectionSchema } from '../social/schemas/connection.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Content.name, schema: ContentSchema },
      { name: User.name, schema: UserSchema },
      { name: Interaction.name, schema: InteractionSchema },
      { name: Connection.name, schema: ConnectionSchema },
    ]),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        config: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', ''),
          keyPrefix: 'discovery:'
        }
      })
    }),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  controllers: [ContentDiscoveryController],
  providers: [
    ContentDiscoveryService, 
    ScoringService,
    RecommendationCacheService,
    ABTestingService
  ],
  exports: [ContentDiscoveryService]
})
export class DiscoveryModule {}
