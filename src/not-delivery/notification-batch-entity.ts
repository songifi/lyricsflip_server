import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { NotificationChannel } from './notification.entity';

export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('notification_batches')
@Index(['status', 'scheduledFor'])
export class NotificationBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: BatchStatus,
    default: BatchStatus.PENDING
  })
  @Index()
  status: BatchStatus;

  @Column({
    type: 'enum',
    enum: NotificationChannel
  })
  @Index()
  channel: NotificationChannel;

  @Column({ type: 'int', default: 0 })
  totalNotifications: number;

  @Column({ type: 'int', default: 0 })
  processedCount: number;

  @Column({ type: 'int', default: 0 })
  successCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column('simple-array', { nullable: true })
  notificationIds: string[];

  @Column('json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
