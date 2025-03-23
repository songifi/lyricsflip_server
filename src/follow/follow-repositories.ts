import { EntityRepository, Repository } from 'typeorm';
import { Follow } from './follow.entity';
import { FollowListQueryDto } from './follow.dto';

@EntityRepository(Follow)
export class FollowRepository extends Repository<Follow> {
  /**
   * Check if a user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const count = await this.count({
      where: { followerId, followingId }
    });
    
    return count > 0;
  }
  
  /**
   * Get followers of a user with pagination
   */
  async getFollowers(
    userId: string, 
    queryDto: FollowListQueryDto
  ): Promise<[Follow[], number]> {
    const { limit = 20, page = 0, search } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('follow')
      .innerJoinAndSelect('follow.follower', 'follower')
      .where('follow.followingId = :userId', { userId });
    
    if (search) {
      query.andWhere('LOWER(follower.username) LIKE LOWER(:search)', { 
        search: `%${search}%` 
      });
    }
    
    query.orderBy('follow.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Get users that a user is following with pagination
   */
  async getFollowing(
    userId: string, 
    queryDto: FollowListQueryDto
  ): Promise<[Follow[], number]> {
    const { limit = 20, page = 0, search } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('follow')
      .innerJoinAndSelect('follow.following', 'following')
      .where('follow.followerId = :userId', { userId });
    
    if (search) {
      query.andWhere('LOWER(following.username) LIKE LOWER(:search)', { 
        search: `%${search}%` 
      });
    }
    
    query.orderBy('follow.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Get follower count for a user
   */
  async getFollowerCount(userId: string): Promise<number> {
    return this.count({
      where: { followingId: userId }
    });
  }
  
  /**
   * Get following count for a user
   */
  async getFollowingCount(userId: string): Promise<number> {
    return this.count({
      where: { followerId: userId }
    });
  }
  
  /**
   * Get mutual follows between two users
   */
  async getMutualFollowIds(userId: string, otherUserId: string): Promise<string[]> {
    // Find users that both userId and otherUserId follow
    const query = this.createQueryBuilder('follow1')
      .select('follow1.followingId', 'userId')
      .where('follow1.followerId = :userId', { userId })
      .andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('follow2.followingId')
          .from(Follow, 'follow2')
          .where('follow2.followerId = :otherUserId', { otherUserId })
          .getQuery();
        return 'follow1.followingId IN ' + subQuery;
      });
    
    const result = await query.getRawMany();
    return result.map(row => row.userId);
  }
  
  /**
   * Get users who follow both the specified users
   */
  async getCommonFollowers(userId: string, otherUserId: string): Promise<string[]> {
    const query = this.createQueryBuilder('follow1')
      .select('follow1.followerId', 'userId')
      .where('follow1.followingId = :userId', { userId })
      .andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('follow2.followerId')
          .from(Follow, 'follow2')
          .where('follow2.followingId = :otherUserId', { otherUserId })
          .getQuery();
        return 'follow1.followerId IN ' + subQuery;
      });
    
    const result = await query.getRawMany();
    return result.map(row => row.userId);
  }
}
