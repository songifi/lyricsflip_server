
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RecommendationCacheService {
  private readonly logger = new Logger(RecommendationCacheService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Get cached recommendations for a user
   */
  async getRecommendations(
    userId: string, 
    type: string, 
    limit: number
  ): Promise<any[] | null> {
    try {
      const cacheKey = `recommendations:${type}:${userId}`;
      const cachedData = await this.redis.get(cacheKey);
      
      if (!cachedData) {
        return null;
      }
      
      const recommendations = JSON.parse(cachedData);
      return recommendations.slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting cached recommendations: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Cache recommendations for a user
   */
  async cacheRecommendations(
    userId: string,
    type: string,
    recommendations: any[],
    ttlSeconds: number
  ): Promise<void> {
    try {
      const cacheKey = `recommendations:${type}:${userId}`;
      await this.redis.set(
        cacheKey,
        JSON.stringify(recommendations),
        'EX',
        ttlSeconds
      );
    } catch (error) {
      this.logger.error(`Error caching recommendations: ${error.message}`, error.stack);
    }
  }

  /**
   * Get cached global recommendations
   */
  async getGlobalRecommendations(
    type: string,
    limit: number
  ): Promise<any[] | null> {
    try {
      const cacheKey = `recommendations:${type}:global`;
      const cachedData = await this.redis.get(cacheKey);
      
      if (!cachedData) {
        return null;
      }
      
      const recommendations = JSON.parse(cachedData);
      return recommendations.slice(0, limit);
    } catch (error) {
      this.logger.error(`Error getting cached global recommendations: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Cache global recommendations
   */
  async cacheGlobalRecommendations(
    type: string,
    recommendations: any[],
    ttlSeconds: number
  ): Promise<void> {
    try {
      const cacheKey = `recommendations:${type}:global`;
      await this.redis.set(
        cacheKey,
        JSON.stringify(recommendations),
        'EX',
        ttlSeconds
      );
    } catch (error) {
      this.logger.error(`Error caching global recommendations: ${error.message}`, error.stack);
    }
  }

  /**
   * Invalidate user recommendations cache
   */
  async invalidateRecommendations(userId: string, type?: string): Promise<void> {
    try {
      if (type) {
        const cacheKey = `recommendations:${type}:${userId}`;
        await this.redis.del(cacheKey);
      } else {
        // Get all keys for this user
        const pattern = `recommendations:*:${userId}`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      this.logger.error(`Error invalidating recommendations cache: ${error.message}`, error.stack);
    }
  }

  /**
   * Invalidate global recommendations cache
   */
  async invalidateGlobalRecommendations(type?: string): Promise<void> {
    try {
      if (type) {
        const cacheKey = `recommendations:${type}:global`;
        await this.redis.del(cacheKey);
      } else {
        // Get all global keys
        const pattern = `recommendations:*:global`;
        const keys = await this.redis.keys(pattern);
        
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      this.logger.error(`Error invalidating global recommendations cache: ${error.message}`, error.stack);
    }
  }
}
