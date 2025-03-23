import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, 
  ManyToOne, JoinColumn, Index, DeleteDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { GameRound } from '../game-round/game-round.entity';

export enum AnswerStatus {
  PENDING = 'pending',
  VALIDATED = 'validated',
  REJECTED = 'rejected'
}

@Entity()
export class RoundAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  roundId: string;

  @ManyToOne(() => GameRound, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: GameRound;

  @Column({ type: 'text' })
  answerText: string;

  @Column({ type: 'enum', enum: AnswerStatus, default: AnswerStatus.PENDING })
  status: AnswerStatus;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isCorrect: boolean;

  @Column({ type: 'int', default: 0 })
  submissionAttempt: number;

  @Column({ type: 'jsonb', nullable: true })
  validationResults: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ type: 'jsonb', default: [] })
  revisionHistory: {
    timestamp: Date;
    previousText: string;
    updatedBy: string;
    reason?: string;
  }[];
}
