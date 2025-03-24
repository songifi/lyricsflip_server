import { EntityRepository, Repository } from 'typeorm';
import { Block } from './block.entity';
import { BlockedUsersQueryDto } from './block.dto';

@EntityRepository(Block)
export class BlockRepository extends Repository<Block> {
  /**
   * Check if a user has blocked another user
   */
  async hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const count = await this.count({
      where: { blockerId, blockedId }
    });
    
    return count > 0;
  }
  
  /**
   * Get blocked users with pagination
   */
  async getBlockedUsers(
    blockerId: string, 
    queryDto: BlockedUsersQueryDto
  ): Promise<[Block[], number]> {
    const { limit = 20, page = 0, search } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('block')
      .innerJoinAndSelect('block.blocked', 'blockedUser')
      .where('block.blockerId = :blockerId', { blockerId });
    
    if (search) {
      query.andWhere('LOWER(blockedUser.username) LIKE LOWER(:search)', { 
        search: `%${search}%` 
      });
    }
    
    query.orderBy('block.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Get users who have blocked the specified user
   */
  async getBlockingUsers(
    blockedId: string, 
    queryDto: BlockedUsersQueryDto
  ): Promise<[Block[], number]> {
    const { limit = 20, page = 0, search } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('block')
      .innerJoinAndSelect('block.blocker', 'blockerUser')
      .where('block.blockedId = :blockedId', { blockedId });
    
    if (search) {
      query.andWhere('LOWER(blockerUser.username) LIKE LOWER(:search)', { 
        search: `%${search}%` 
      });
    }
    
    query.orderBy('block.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Get blocked user count
   */
  async getBlockedCount(blockerId: string): Promise<number> {
    return this.count({
      where: { blockerId }
    });
  }
  
  /**
   * Get blocking user count (users who blocked this user)
   */
  async getBlockingCount(blockedId: string): Promise<number> {
    return this.count({
      where: { blockedId }
    });
  }
  
  /**
   * Get all IDs of users blocked by a user
   */
  async getBlockedUserIds(blockerId: string): Promise<string[]> {
    const blocks = await this.find({
      select: ['blockedId'],
      where: { blockerId }
    });
    
    return blocks.map(block => block.blockedId);
  }
  
  /**
   * Get all IDs of users who blocked a user
   */
  async getBlockerUserIds(blockedId: string): Promise<string[]> {
    const blocks = await this.find({
      select: ['blockerId'],
      where: { blockedId }
    });
    
    return blocks.map(block => block.blockerId);
  }
  
  /**
   * Find a specific block
   */
  async findBlock(
    blockerId: string, 
    blockedId: string
  ): Promise<Block | undefined> {
    return this.findOne({
      where: { blockerId, blockedId }
    });
  }
}
