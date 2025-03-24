import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, 
  ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { User } from '../user/user.entity';

@Entity('user_blocks')
@Unique(['blockerId', 'blockedId']) // Prevent duplicate blocks
@Index(['blockerId'])
@Index(['blockedId'])
export class Block {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  blockerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockerId' })
  blocker: User;

  @Column()
  blockedId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blockedId' })
  blocked: User;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
