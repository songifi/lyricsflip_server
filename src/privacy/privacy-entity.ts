// src/privacy/entities/privacy-settings.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum ProfileVisibility {
  PUBLIC = 'public',
  FOLLOWERS_ONLY = 'followers_only',
  PRIVATE = 'private'
}

export enum ContentVisibility {
  PUBLIC = 'public',
  FOLLOWERS_ONLY = 'followers_only',
  FRIENDS_ONLY = 'friends_only', // Mutual followers
  PRIVATE = 'private'
}

export enum FollowApprovalMode {
  AUTOMATIC = 'automatic',
  MANUAL = 'manual'
}

@Entity('privacy_settings')
export class PrivacySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({
    type: 'enum',
    enum: ProfileVisibility,
    default: ProfileVisibility.PUBLIC
  })
  profileVisibility: ProfileVisibility;

  @Column({
    type: 'enum',
    enum: ContentVisibility,
    default: ContentVisibility.PUBLIC
  })
  postVisibility: ContentVisibility;

  @Column({
    type: 'enum',
    enum: ContentVisibility,
    default: ContentVisibility.PUBLIC
  })
  messageVisibility: ContentVisibility;

  @Column({
    type: 'enum',
    enum: FollowApprovalMode,
    default: FollowApprovalMode.AUTOMATIC
  })
  followApprovalMode: FollowApprovalMode;

  @Column({ default: true })
  showOnlineStatus: boolean;

  @Column({ default: true })
  showLastSeen: boolean;

  @Column({ default: true })
  allowTagging: boolean;

  @Column({ default: true })
  allowMentions: boolean;

  @Column({ default: true })
  showInSearchResults: boolean;

  @Column({ default: true })
  allowDirectMessages: boolean;

  @Column({ default: false })
  blockScreenshots: boolean;

  @Column({ type: 'json', default: '{}' })
  customSettings: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// src/privacy/entities/follow-request.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum FollowRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

@Entity('follow_requests')
export class FollowRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  requester: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  target: User;

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
}
