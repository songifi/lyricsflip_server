// src/comments/entities/comment.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, 
  ManyToOne, OneToMany, JoinColumn, DeleteDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';
import { CommentStatus } from '../comment.constants';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id' })
  contentId: string;

  @ManyToOne(() => Content, content => content.comments)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.comments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  text: string;

  @Column({ 
    type: 'enum', 
    enum: CommentStatus, 
    default: CommentStatus.PENDING 
  })
  status: CommentStatus;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => Comment, comment => comment.replies)
  @JoinColumn({ name: 'parent_id' })
  parent: Comment;

  @OneToMany(() => Comment, comment => comment.parent)
  replies: Comment[];

  @Column({ name: 'depth', default: 0 })
  depth: number;

  @Column({ name: 'path', default: '' })
  path: string;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'replies_count', default: 0 })
  repliesCount: number;

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  @Column({ name: 'edited_at', nullable: true })
  editedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;
}

// src/comments/entities/comment-like.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, 
  ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';

@Entity('comment_likes')
@Unique(['userId', 'commentId'])
export class CommentLike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id' })
  commentId: string;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// src/comments/entities/comment-report.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, 
  ManyToOne, JoinColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Comment } from './comment.entity';
import { ReportStatus, ReportReason } from '../comment.constants';

@Entity('comment_reports')
export class CommentReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'comment_id' })
  commentId: string;

  @ManyToOne(() => Comment)
  @JoinColumn({ name: 'comment_id' })
  comment: Comment;

  @Column({ name: 'reporter_id' })
  reporterId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User;

  @Column({
    type: 'enum',
    enum: ReportReason
  })
  reason: ReportReason;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING
  })
  status: ReportStatus;

  @Column({ name: 'moderator_id', nullable: true })
  moderatorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'moderator_id' })
  moderator: User;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/comments/comment.constants.ts

export enum CommentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED'
}

export enum ReportReason {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  HATE_SPEECH = 'HATE_SPEECH',
  INAPPROPRIATE = 'INAPPROPRIATE',
  MISINFORMATION = 'MISINFORMATION',
  OTHER = 'OTHER'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESOLVED = 'RESOLVED'
}

export enum CommentSortOrder {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  MOST_LIKED = 'MOST_LIKED',
  MOST_REPLIES = 'MOST_REPLIES'
}

export enum CommentEvents {
  CREATED = 'comment.created',
  UPDATED = 'comment.updated',
  DELETED = 'comment.deleted',
  LIKED = 'comment.liked',
  UNLIKED = 'comment.unliked',
  REPORTED = 'comment.reported',
  STATUS_CHANGED = 'comment.status.changed'
}
