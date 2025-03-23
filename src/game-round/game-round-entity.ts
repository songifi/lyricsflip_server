import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Song } from '../song/song.entity';
import { LyricSelection } from '../lyric-selection/lyric-selection.entity';

export enum GameRoundStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

@Entity()
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: GameRoundStatus,
    default: GameRoundStatus.PENDING
  })
  status: GameRoundStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  creator: User;
  
  @Column()
  creatorId: string;

  @ManyToOne(() => Song, { eager: true })
  @JoinColumn()
  song: Song;
  
  @Column()
  songId: string;

  @OneToMany(() => LyricSelection, lyricSelection => lyricSelection.gameRound)
  lyricSelections: LyricSelection[];

  @Column({ type: 'int', default: 0 })
  maxParticipants: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledStartTime: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 300 }) // default 5 minutes in seconds
  roundDuration: number;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
