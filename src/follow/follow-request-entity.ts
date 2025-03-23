import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, 
  ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../user/user.entity';

export enum FollowRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('follow_requests')
@Unique(['requesterId', 'recipientId']) // Prevent duplicate requests
@Index(['requesterId'])
@Index(['recipientId'])
@Index(['status'])
export class FollowRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requesterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @Column()
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({
    type: 'enum',
    enum: FollowRequestStatus,
    default: FollowRequestStatus.PENDING
  })
  status: FollowRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  responseDate: Date;

  @Column({ type: 'text', nullable: true })
  note: string;
}
