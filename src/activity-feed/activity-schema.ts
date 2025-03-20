// src/modules/activity/schemas/activity.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

export enum ActivityType {
  // User interactions
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  LIKE = 'like',
  UNLIKE = 'unlike',
  COMMENT = 'comment',
  SHARE = 'share',
  
  // Content creation
  CREATE_PLAYLIST = 'create_playlist',
  UPDATE_PLAYLIST = 'update_playlist',
  ADD_TO_PLAYLIST = 'add_to_playlist',
  
  // Game related
  GAME_PLAYED = 'game_played',
  GAME_WON = 'game_won',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  
  // Profile actions
  PROFILE_UPDATE = 'profile_update',
  JOINED = 'joined',
}

export enum ActivityPrivacy {
  PUBLIC = 'public',     // Visible to everyone
  FOLLOWERS = 'followers', // Visible only to followers
  FRIENDS = 'friends',   // Visible only to mutual follows
  PRIVATE = 'private',   // Visible only to the user
}

export interface ActivityTarget {
  type: string;   // Type of target (user, song, playlist, etc)
  id: string;     // ID of the target
  details?: any;  // Additional details
}

@Schema({ timestamps: true })
export class Activity extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: User;

  @Prop({
    type: String,
    enum: Object.values(ActivityType),
    required: true,
    index: true,
  })
  type: ActivityType;

  @Prop({
    type: Object,
    required: true,
  })
  target: ActivityTarget;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;

  @Prop({
    type: String,
    enum: Object.values(ActivityPrivacy),
    default: ActivityPrivacy.PUBLIC,
    index: true,
  })
  privacy: ActivityPrivacy;

  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  createdAt: Date;

  @Prop({
    type: String,
    default: null,
  })
  groupKey: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Create indexes to optimize common queries
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ type: 1, 'target.id': 1 });
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ groupKey: 1 });
