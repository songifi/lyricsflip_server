import { EntityRepository, Repository } from 'typeorm';
import { Notification, NotificationStatus } from './notification.entity';
import { NotificationQueryDto } from './notification.dto';

@EntityRepository(Notification)
export class NotificationRepository extends Repository<Notification> {
  /**
   * Find notifications with filtering
   */
  async findNotifications(
    userId: string,
    queryDto: NotificationQueryDto
  ): Promise<[Notification[], number]> {
    const { 
      type, 
      read, 
      status, 
      actorId, 
      limit = 20, 
      page = 0,
      startDate,
      endDate
    } = queryDto;
    const skip = page * limit;
    
    const query = this.createQueryBuilder('notification')
      .leftJoinAndSelect('notification.actor', 'actor')
      .where('notification.userId = :userId', { userId });
    
    if (type) {
      query.andWhere('notification.type = :type', { type });
    }
    
    if (read !== undefined) {
      query.andWhere('notification.read = :read', { read });
    }
    
    if (status) {
      query.andWhere('notification.status = :status', { status });
    }
    
    if (actorId) {
      query.andWhere('notification.actorId = :actorId', { actorId });
    }
    
    if (startDate) {
      query.andWhere('notification.createdAt >= :startDate', { startDate });
    }
    
    if (endDate) {
      query.andWhere('notification.createdAt <= :endDate', { endDate });
    }
    
    query.orderBy('notification.createdAt', 'DESC')
      .skip(skip)
      .take(limit);
    
    return query.getManyAndCount();
  }
  
  /**
   * Count unread notifications
   */
  async countUnread(userId: string): Promise<number> {
    return this.count({
      where: {
        userId,
        read: false,
        status: NotificationStatus.DELIVERED
      }
    });
  }
  
  /**
   * Mark multiple notifications as read
   */
  async markAsRead(ids: string[]): Promise<number> {
    const result = await this.update(
      { id: In(ids) },
      { 
        read: true, 
        readAt: new Date() 
      }
    );
    
    return result.affected || 0;
  }
  
  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.update(
      { userId, read: false },
      { 
        read: true, 
        readAt: new Date() 
      }
    );
    
    return result.affected || 0;
  }
  
  /**
   * Get notifications for batching (up to a limit, of a specific type, in PENDING status)
   */
  async getNotificationsForBatch(channel: string, limit: number): Promise<Notification[]> {
    return this.createQueryBuilder('notification')
      .where('notification.channel = :channel', { channel })
      .andWhere('notification.status = :status', { status: NotificationStatus.PENDING })
      .orderBy('notification.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }
  
  /**
   * Get notification counts by type
   */
  async getCountsByType(userId: string): Promise<Record<string, number>> {
    const counts = await this.createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('notification.userId = :userId', { userId })
      .groupBy('notification.type')
      .getRawMany();
    
    // Convert array of results to a record object
    return counts.reduce((acc, item) => {
      acc[item.type] = parseInt(item.count);
      return acc;
    }, {});
  }
}

// Make TypeORM In operator available
import { In } from 'typeorm';
