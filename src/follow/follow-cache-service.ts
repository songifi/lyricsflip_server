import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs/redis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FollowCacheService {
  private readonly logger = new Logger(FollowCacheService.name);
  private readonly CACHE_TTL: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService
  ) {
    // Cache TTL in seconds, default to 1 hour
    this.CACHE_TTL = this.configService.get<number>('FOLLOW_CACHE_TTL', 3600);
  }

  /**
   * Cache follower and following counts for a user
   */
  async cacheFollowCounts(
    userId: string, 
    followerCount: number, 
    followingCount: number
  ): Promise<void> {
    try {
      const followerKey = `follow:count:followers:${userId}`;
      const followingKey = `follow:count:following:${userId}`;
      
      await Promise.all([
        this.redis.set(followerKey, followerCount, 'EX', this.CACHE_TTL),
        this.redis.set(followingKey, followingCount, 'EX', this.CACHE_TTL)
      ]);
    } catch (error) {
      this.logger.error(`Failed to cache follow counts: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Get cached follower count for a user
   */
  async getCachedFollowerCount(userId: string): Promise<number | null> {
    try {
      const key = `follow:count:followers:${userId}`;
      const count = await this.redis.get(key);
      
      return count ? parseInt(count) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached follower count: ${error.message}`, error.stack);
      return null;
    }
  }
  
  /**
   * Get cached following count for a user
   */
  async getCachedFollowingCount(userId: string): Promise<number | null> {
    try {
      const key = `follow:count:following:${userId}`;
      const count = await this.redis.get(key);
      
      return count ? parseInt(count) : null;
    } catch (error) {
      this.logger.error(`Failed to get cached following count: ${error.message}`, error.stack);
      return null;
    }
  }
  
  /**
   * Get both follower and following counts for a user
   */
  async getCachedFollowCounts(userId: string): Promise<{ 
    followerCount: number | null; 
    followingCount: number | null 
  }> {
    try {
      const followerKey = `follow:count:followers:${userId}`;
      const followingKey = `follow:count:following:${userId}`;
      
      const [followerCount, followingCount] = await Promise.all([
        this.redis.get(followerKey),
        this.redis.get(followingKey)
      ]);
      
      return {
        followerCount: followerCount ? parseInt(followerCount) : null,
        followingCount: followingCount ? parseInt(followingCount) : null
      };
    } catch (error) {
      this.logger.error(`Failed to get cached follow counts: ${error.message}`, error.stack);
      return { followerCount: null, followingCount: null };
    }
  }
  
  /**
   * Increment cached follower count
   */
  async incrementFollowerCount(userId: string): Promise<void> {
    try {
      const key = `follow:count:followers:${userId}`;
      
      // Check if key exists first
      const exists = await this.redis.exists(key);
      
      if (exists) {
        await this.redis.incr(key);
        await this.redis.expire(key, this.CACHE_TTL);
      }
    } catch (error) {
      this.logger.error(`Failed to increment follower count: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Decrement cached follower count
   */
  async decrementFollowerCount(userId: string): Promise<void> {
    try {
      const key = `follow:count:followers:${userId}`;
      
      // Check if key exists first
      const exists = await this.redis.exists(key);
      
      if (exists) {
        await this.redis.decr(key);
        await this.redis.expire(key, this.CACHE_TTL);
      }
    } catch (error) {
      this.logger.error(`Failed to decrement follower count: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Increment cached following count
   */
  async incrementFollowingCount(userId: string): Promise<void> {
    try {
      const key = `follow:count:following:${userId}`;
      
      // Check if key exists first
      const exists = await this.redis.exists(key);
      
      if (exists) {
        await this.redis.incr(key);
        await this.redis.expire(key, this.CACHE_TTL);
      }
    } catch (error) {
      this.logger.error(`Failed to increment following count: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Decrement cached following count
   */
  async decrementFollowingCount(userId: string): Promise<void> {
    try {
      const key = `follow:count:following:${userId}`;
      
      // Check if key exists first
      const exists = await this.redis.exists(key);
      
      if (exists) {
        await this.redis.decr(key);
        await this.redis.expire(key, this.CACHE_TTL);
      }
    } catch (error) {
      this.logger.error(`Failed to decrement following count: ${error.message}`, error.stack);
    }
  }
  
  /**
   * Invalidate follow count cache for a user
   */
  async invalidateFollowCountCache(userId: string): Promise<void> {
    try {
      const followerKey = `follow:count:followers:${userId}`;
      const followingKey = `follow:count:following:${userId}`;
      
      await Promise.all([
        this.redis.del(followerKey),
        this.redis.del(followingKey)
      ]);
    } catch (error) {
      this.logger.error(`Failed to invalidate follow count cache: ${error.message}`, error.stack);
    }
  }
}
