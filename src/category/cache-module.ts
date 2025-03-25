import { Module, CacheModule as NestCacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { CacheService } from './cache.service';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        if (isProduction) {
          return {
            store: redisStore,
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            ttl: 60 * 60, // 1 hour default TTL
            max: 1000, // Maximum number of items in cache
          };
        } else {
          return {
            ttl: 60 * 5, // 5 minutes default TTL in development
            max: 100, // Smaller cache size in development
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}