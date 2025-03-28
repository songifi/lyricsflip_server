// src/shares/entities/share.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';
import { SharePlatform, ShareVisibility } from '../share.constants';

@Entity('shares')
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_id' })
  contentId: string;

  @ManyToOne(() => Content, content => content.shares)
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, user => user.shares)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: SharePlatform,
    default: SharePlatform.INTERNAL
  })
  platform: SharePlatform;

  @Column({
    type: 'enum',
    enum: ShareVisibility,
    default: ShareVisibility.PUBLIC
  })
  visibility: ShareVisibility;

  @Column({ name: 'share_link', nullable: true })
  shareLink: string;

  @Column({ name: 'preview_url', nullable: true })
  previewUrl: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'click_count', default: 0 })
  clickCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/shares/entities/share-view.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Share } from './share.entity';

@Entity('share_views')
export class ShareView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'share_id' })
  shareId: string;

  @ManyToOne(() => Share, share => share.id)
  @JoinColumn({ name: 'share_id' })
  share: Share;

  @Column({ name: 'viewer_ip', nullable: true })
  viewerIp: string;

  @Column({ nullable: true })
  referrer: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

// src/shares/share.constants.ts

export enum SharePlatform {
  INTERNAL = 'INTERNAL',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  LINKEDIN = 'LINKEDIN',
  EMAIL = 'EMAIL',
  EMBED = 'EMBED'
}

export enum ShareVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  RESTRICTED = 'RESTRICTED' // Only specific users can access
}

export enum ShareEvents {
  CREATED = 'share.created',
  VIEWED = 'share.viewed',
  CLICKED = 'share.clicked',
  DELETED = 'share.deleted',
  EXPIRED = 'share.expired'
}
