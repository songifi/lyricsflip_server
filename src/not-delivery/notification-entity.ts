import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';

export enum NotificationType {
  NEW_FOLLOWER = 'new_follower',
  NEW_LIKE = 'new_like',
  NEW_COMMENT = 'new_comment',
  MENTION = 'mention',
  NEW_MESSAGE = 'new_message',
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPT = 'friend_accept',
  SYSTEM = 'system'
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms'
}

export enum NotificationStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

@Entity('notifications')
@Index(['userId', 'createdAt']) // For efficient querying
@Index(['userId', 'read']) // For unread counts
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  @Index()
  type: NotificationType;

  @Column({ nullable: true })
  actorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorId' })
  actor: User;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({
    default: false
  })
  @Index()
  read: boolean;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING
  })
  @Index()
  status: NotificationStatus;

  @Column('json', { nullable: true })
  data: any;

  @Column('json', { nullable: true })
  metadata: any;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP
  })
  channel: NotificationChannel;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  readAt: Date;
}
