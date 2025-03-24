import { EntityRepository, Repository, LessThanOrEqual } from 'typeorm';
import { NotificationBatch, BatchStatus } from './notification-batch.entity';
import { NotificationChannel } from './notification.entity';

@EntityRepository(NotificationBatch)
export class NotificationBatchRepository extends Repository<NotificationBatch> {
  /**
   * Find batches ready for processing
   */
  async findReadyBatches(limit: number = 5): Promise<NotificationBatch[]> {
    const now = new Date();
    
    return this.createQueryBuilder('batch')
      .where('batch.status = :status', { status: BatchStatus.PENDING })
      .andWhere('(batch.scheduledFor IS NULL OR batch.scheduledFor <= :now)', { now })
      .orderBy('batch.createdAt', 'ASC')
      .limit(limit)
      .getMany();
  }
  
  /**
   * Find stalled batches (processing for too long)
   */
  async findStalledBatches(stalledMinutes: number = 15): Promise<NotificationBatch[]> {
    const stalledBefore = new Date();
    stalledBefore.setMinutes(stalledBefore.getMinutes() - stalledMinutes);
    
    return this.createQueryBuilder('batch')
      .where('batch.status = :status', { status: BatchStatus.PROCESSING })
      .andWhere('batch.startedAt <= :stalledBefore', { stalledBefore })
      .orderBy('batch.startedAt', 'ASC')
      .getMany();
  }
  
  /**
   * Create a new batch for notifications
   */
  async createBatch(
    channel: NotificationChannel,
    notificationIds: string[],
    scheduledFor?: Date
  ): Promise<NotificationBatch> {
    const batch = this.create({
      channel,
      status: BatchStatus.PENDING,
      totalNotifications: notificationIds.length,
      notificationIds,
      scheduledFor
    });
    
    return this.save(batch);
  }
  
  /**
   * Mark batch as processing
   */
  async startProcessing(id: string): Promise<NotificationBatch | undefined> {
    await this.update(id, {
      status: BatchStatus.PROCESSING,
      startedAt: new Date()
    });
    
    return this.findOne(id);
  }
  
  /**
   * Update batch progress
   */
  async updateProgress(
    id: string,
    processedCount: number,
    successCount: number,
    failureCount: number
  ): Promise<void> {
    await this.update(id, {
      processedCount,
      successCount,
      failureCount
    });
  }
  
  /**
   * Mark batch as completed
   */
  async completeBatch(
    id: string,
    processedCount: number,
    successCount: number,
    failureCount: number
  ): Promise<void> {
    await this.update(id, {
      status: BatchStatus.COMPLETED,
      processedCount,
      successCount,
      failureCount,
      completedAt: new Date()
    });
  }
  
  /**
   * Mark batch as failed
   */
  async failBatch(id: string, metadata?: any): Promise<void> {
    await this.update(id, {
      status: BatchStatus.FAILED,
      completedAt: new Date(),
      metadata: metadata ? { ...metadata, error: true } : { error: true }
    });
  }
  
  /**
   * Clean up old completed batches (data retention)
   */
  async cleanupOldBatches(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const result = await this.delete({
      status: BatchStatus.COMPLETED,
      completedAt: LessThanOrEqual(cutoffDate)
    });
    
    return result.affected || 0;
  }
}
