import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { NotificationType, NotificationChannel } from './notification.entity';

@Entity('notification_templates')
@Index(['type', 'channel'])
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
    unique: true
  })
  @Index()
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP
  })
  channel: NotificationChannel;

  @Column()
  titleTemplate: string;

  @Column('text')
  bodyTemplate: string;

  @Column('json', { nullable: true })
  dataTemplate: any;

  @Column({ default: true })
  active: boolean;

  @Column('json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
