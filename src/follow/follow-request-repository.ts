import { EntityRepository, Repository } from 'typeorm';
import { FollowRequest, FollowRequestStatus } from './follow-request.entity';
import { PendingRequestsQueryDto } from './follow.dto';

@EntityRepository(FollowRequest)
export class FollowRequestRepository extends Repository<FollowRequest> {
  /**
   * Check if a user has a pending follow request to another user
   */
  async hasPendingRequest(requesterId: string, recipientId: string): Promise<boolean> {
    const count = await this.count({
      where: { 
        requesterId, 
        recipientId, 
        status: FollowRequestStatus.PENDING 
      }
    });
    
    return count > 0;
  }
  
  /**
   * Get received follow requests with pagination
   */
  async getReceivedRequests(
    userId: string, 
    queryDto: PendingRequestsQueryDto
  ): Promise<[FollowRequest[], number]> {
    const { limit = 20, page = 0, search, status = FollowRequestStatus.PENDING } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('request')
      .innerJoinAndSelect('request.requester', 'requester')
      .where('request.recipientId = :userId', { userId })
      .andWhere('request.status = :status', { status });
    
    if (search) {
      query.andWhere('LOWER(requester.username) LIKE LOWER(:search)', { 
        search: `%${search}%` 
      });
    }
    
    query.orderBy('request.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Get sent follow requests with pagination
   */
  async getSentRequests(
    userId: string, 
    queryDto: PendingRequestsQueryDto
  ): Promise<[FollowRequest[], number]> {
    const { limit = 20, page = 0, search, status = FollowRequestStatus.PENDING } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('request')
      .innerJoinAndSelect('request.recipient', 'recipient')
      .where('request.requesterId = :userId', { userId })
      .andWhere('request.status = :status', { status });
    
    if (search) {
      query.andWhere('LOWER(recipient.username) LIKE LOWER(:search)', { 
        search: `%${search}%` 
      });
    }
    
    query.orderBy('request.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Get pending follow request count for a user
   */
  async getPendingRequestCount(userId: string): Promise<number> {
    return this.count({
      where: { 
        recipientId: userId, 
        status: FollowRequestStatus.PENDING 
      }
    });
  }
  
  /**
   * Find a specific follow request
   */
  async findRequest(
    requesterId: string, 
    recipientId: string
  ): Promise<FollowRequest | undefined> {
    return this.findOne({
      where: { requesterId, recipientId }
    });
  }
}
