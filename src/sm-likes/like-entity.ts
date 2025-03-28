// src/likes/entities/like.entity.ts
import { 
  Entity, 
  Column, 
  PrimaryGeneratedColumn, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn, 
  Index, 
  Unique
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LikeableType } from '../enums/likeable-type.enum';

@Entity('likes')
@Unique(['userId', 'likeableId', 'likeableType']) // Prevent duplicate likes
@Index(['likeableId', 'likeableType']) // For querying likes for specific content
@Index(['userId', 'createdAt']) // For user activity feeds
@Index(['likeableType', 'createdAt']) // For trending content by type
export class Like {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.likes)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'likeable_id' })
  likeableId: string;

  @Column({
    name: 'likeable_type',
    type: 'enum',
    enum: LikeableType
  })
  likeableType: LikeableType;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual field for polymorphic relationship (not stored in database)
  likeable?: any;
}

// src/likes/enums/likeable-type.enum.ts
export enum LikeableType {
  SONG = 'SONG',
  ALBUM = 'ALBUM',
  PLAYLIST = 'PLAYLIST',
  ARTIST = 'ARTIST',
  USER = 'USER',
  COMMENT = 'COMMENT',
  POST = 'POST'
}
