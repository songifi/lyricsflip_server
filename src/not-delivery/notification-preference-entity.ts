import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../user/user.entity';
import { NotificationType, NotificationChannel } from './notification.entity';

@Entity('notification_preferences')
@Unique(['userId', 'type']) // Each user can have only one preference per notification type
@Index(['userId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
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

  @Column({ default: true })
  enabled: boolean;

  @Column('simple-array')
  enabledChannels: NotificationChannel[];

  @Column({ type: 'time', nullable: true })
  quietHoursStart: string;

  @Column({ type: 'time', nullable: true })
  quietHoursEnd: string;

  @Column({ default: true })
  emailDigest: boolean;

  @Column({ default: 'daily' })
  digestFrequency: 'daily' | 'weekly' | 'never';

  @Column('json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
