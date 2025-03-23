import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs/redis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  
  // Default rate limits (can be overridden by config)
  private readonly FOLLOW_LIMIT_PER_DAY = 100;
  private readonly FOLLOW_LIMIT_PER_HOUR = 20;
  private readonly FOLLOW_REQUEST_LIMIT_PER_DAY = 50;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService
  ) {
    // Load rate limit configs
    this.FOLLOW_LIMIT_PER_DAY = this.configService.get<number>('FOLLOW_LIMIT_PER_DAY', 100);
    this.FOLLOW_LIMIT_PER_HOUR = this.configService.get<number>('FOLLOW_LIMIT_PER_HOUR', 20);
    this.FOLLOW_REQUEST_LIMIT_PER_DAY = this.configService.get<number>('FOLLOW_REQUEST_LIMIT_PER_DAY', 50);
  }

  /**
   * Check if user has exceeded follow rate limit
   */
  async hasExceededFollowLimit(userId: string): Promise<boolean> {
    try {
      const hourlyKey = `follow:hourly:${userId}`;
      const dailyKey = `follow:daily:${userId}`;
      
      const hourlyCount = await this.redis.get(hourlyKey);
      const dailyCount = await this.redis.get(dailyKey);
      
      return (
        (hourlyCount && parseInt(hourlyCount) >= this.FOLLOW_LIMIT_PER_HOUR) ||
        (dailyCount && parseInt(dailyCount) >= this.FOLLOW_LIMIT_PER_DAY)
      );
    } catch (error) {
      this.logger.error(`Failed to check follow rate limit: ${error.message}`, error.stack);
      return false; // Fail open if Redis is down
    }
  }
  
  /**
   * Check if user has exceeded follow request rate limit
   */
  async hasExceededFollowRequestLimit(userId: string): Promise<boolean> {
    try {
      const dailyKey = `follow:request:daily:${userId}`;
      
      const dailyCount = await this.redis.get(dailyKey);
      
      return (
        dailyCount && parseInt(dailyCount) >= this.FOLLOW_REQUEST_LIMIT_PER_DAY
      );
    } catch (error) {
      this.logger.error(`Failed to check follow request rate limit: ${error.message}`, error.stack);
      return false; // Fail open if Redis is down
    }
  }
  
  /**
   * Increment follow counter for a user
   */
  async incrementFollowCounter(userId: string): Promise<void> {
    try {
      const hourlyKey = `follow:hourly:${userId}`;
      const dailyKey = `follow:daily:${userId}`;
      
      const hourlyExpire = 60 * 60; // 1 hour
      const dailyExpire = 24 * 60 * 60; // 24 hours
      
      const hourlyCount = await this.redis.incr(hourlyKey);
      const dailyCount = await this.redis.incr(dailyKey);
      
      // Set expiration if this is a new key
      if (hourlyCount === 1) {
        await this.redis.expire(hourlyKey, hourlyExpire);
      }
      
      if (dailyCount === 1) {
        await this.redis.expire(dailyKey, dailyExpire);
      }
    } catch (error) {
      this.logger.error(`Failed to increment follow counter: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Increment follow request counter for a user
   */
  async incrementFollowRequestCounter(userId: string): Promise<void> {
    try {
      const dailyKey = `follow:request:daily:${userId}`;
      
      const dailyExpire = 24 * 60 * 60; // 24 hours
      
      const dailyCount = await this.redis.incr(dailyKey);
      
      // Set expiration if this is a new key
      if (dailyCount === 1) {
        await this.redis.expire(dailyKey, dailyExpire);
      }
    } catch (error) {
      this.logger.error(`Failed to increment follow request counter: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Get current follow count for a user within rate limit window
   */
  async getCurrentFollowCounts(userId: string): Promise<{ hourly: number; daily: number }> {
    try {
      const hourlyKey = `follow:hourly:${userId}`;
      const dailyKey = `follow:daily:${userId}`;
      
      const [hourlyCount, dailyCount] = await Promise.all([
        this.redis.get(hourlyKey),
        this.redis.get(dailyKey)
      ]);
      
      return {
        hourly: hourlyCount ? parseInt(hourlyCount) : 0,
        daily: dailyCount ? parseInt(dailyCount) : 0
      };
    } catch (error) {
      this.logger.error(`Failed to get follow counts: ${error.message}`, error.stack);
      return { hourly: 0, daily: 0 };
    }
  }
  
  /**
   * Get current follow request count for a user within rate limit window
   */
  async getCurrentFollowRequestCount(userId: string): Promise<number> {
    try {
      const dailyKey = `follow:request:daily:${userId}`;
      
      const dailyCount = await this.redis.get(dailyKey);
      
      return dailyCount ? parseInt(dailyCount) : 0;
    } catch (error) {
      this.logger.error(`Failed to get follow request count: ${error.message}`, error.stack);
      return 0;
    }
  }
}
