import { Injectable, Logger } from '@nestjs/common';
import { BlockService } from './block.service';
import { SelectQueryBuilder } from 'typeorm';

/**
 * Service to filter content based on block relationships
 */
@Injectable()
export class ContentFilterService {
  private readonly logger = new Logger(ContentFilterService.name);

  constructor(private readonly blockService: BlockService) {}

  /**
   * Apply block filters to a TypeORM query
   * This prevents content from blocked users from appearing in the results
   */
  async applyBlockFilters<T>(
    query: SelectQueryBuilder<T>,
    userId: string,
    userIdField: string = 'userId',
    tableAlias: string = 'entity'
  ): Promise<SelectQueryBuilder<T>> {
    try {
      // Get block impact for the user
      const blockImpact = await this.blockService.getBlockImpact(userId);
      
      // If there are no blocks, return the query unchanged
      if (blockImpact.excludeUserIds.length === 0) {
        return query;
      }
      
      // Add where clause to exclude content from blocked users
      query.andWhere(`${tableAlias}.${userIdField} NOT IN (:...excludeUserIds)`, {
        excludeUserIds: blockImpact.excludeUserIds
      });
      
      return query;
    } catch (error) {
      this.logger.error(`Error applying block filters: ${error.message}`, error.stack);
      // Return the original query if there's an error
      return query;
    }
  }

  /**
   * Apply block filters to an array of content items
   * This filters out content from blocked users
   */
  async filterContentArray<T>(
    items: T[],
    userId: string,
    getUserIdFromItem: (item: T) => string
  ): Promise<T[]> {
    try {
      // Get block impact for the user
      const blockImpact = await this.blockService.getBlockImpact(userId);
      
      // If there are no blocks, return the original array
      if (blockImpact.excludeUserIds.length === 0) {
        return items;
      }
      
      // Filter out items from blocked users
      return items.filter(item => {
        const itemUserId = getUserIdFromItem(item);
        return !blockImpact.excludeUserIds.includes(itemUserId);
      });
    } catch (error) {
      this.logger.error(`Error filtering content array: ${error.message}`, error.stack);
      // Return the original array if there's an error
      return items;
    }
  }

  /**
   * Filter a user IDs array to remove blocked users
   */
  async filterUserIds(
    userIds: string[],
    currentUserId: string
  ): Promise<string[]> {
    try {
      // Get block impact for the user
      const blockImpact = await this.blockService.getBlockImpact(currentUserId);
      
      // If there are no blocks, return the original array
      if (blockImpact.excludeUserIds.length === 0) {
        return userIds;
      }
      
      // Filter out blocked user IDs
      return userIds.filter(id => !blockImpact.excludeUserIds.includes(id));
    } catch (error) {
      this.logger.error(`Error filtering user IDs: ${error.message}`, error.stack);
      // Return the original array if there's an error
      return userIds;
    }
  }

  /**
   * Apply MongoDB query conditions to filter out content from blocked users
   */
  async getMongoBlockFilter(userId: string): Promise<Record<string, any>> {
    try {
      // Get block impact for the user
      const blockImpact = await this.blockService.getBlockImpact(userId);
      
      // If there are no blocks, return empty filter
      if (blockImpact.excludeUserIds.length === 0) {
        return {};
      }
      
      // Return MongoDB query condition
      return {
        userId: { $nin: blockImpact.excludeUserIds }
      };
    } catch (error) {
      this.logger.error(`Error getting MongoDB block filter: ${error.message}`, error.stack);
      // Return empty filter if there's an error
      return {};
    }
  }

  /**
   * Check if two users can interact based on block status
   */
  async canUsersInteract(userId1: string, userId2: string): Promise<boolean> {
    try {
      // If same user, always allow
      if (userId1 === userId2) {
        return true;
      }
      
      // Check if either user has blocked the other
      const hasAnyBlock = await this.blockService.hasAnyBlock(userId1, userId2);
      
      return !hasAnyBlock;
    } catch (error) {
      this.logger.error(`Error checking if users can interact: ${error.message}`, error.stack);
      // Default to allow interaction if there's an error
      return true;
    }
  }
}
