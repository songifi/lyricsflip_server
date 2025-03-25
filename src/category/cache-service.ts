import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Store a value in cache
   * @param ttl Time to live in seconds
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl ? { ttl } : undefined);
  }

  /**
   * Remove a value from cache
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Clear the entire cache
   */
  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  /**
   * Invalidate cache by key pattern
   * This is only a basic implementation that works for exact keys or keys with a * wildcard at the end
   */
  async invalidate(keyPattern: string): Promise<void> {
    if (keyPattern.endsWith('*')) {
      // For Redis, we would use scan commands here
      // For now, we use a simple implementation for in-memory cache
      const baseKey = keyPattern.slice(0, -1);
      const keys = await this.getKeys();
      
      const keysToDelete = keys.filter(key => key.startsWith(baseKey));
      await Promise.all(keysToDelete.map(key => this.del(key)));
    } else {
      await this.del(keyPattern);
    }
  }

  /**
   * Get all cache keys
   * This is a basic implementation for in-memory cache
   * For Redis, we would use Redis commands to get all keys
   */
  private async getKeys(): Promise<string[]> {
    try {
      // This is a hacky way to get all keys from cache-manager
      // In a real implementation with Redis, we would use Redis commands
      const store = (this.cacheManager as any).store;
      if (store && store.keys) {
        return await store.keys();
      }
      return [];
    } catch (error) {
      return [];
    }
  }
}