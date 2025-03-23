import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoose from 'mongoose';

export enum NotificationType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  MENTION = 'mention',
  SHARE = 'share',
  FRIEND_REQUEST = 'friend_request',
  MESSAGE = 'message',
  SYSTEM = 'system'
}

export enum ContentType {
  POST = 'post',
  COMMENT = 'comment',
  USER = 'user',
  MESSAGE = 'message',
  SYSTEM = 'system'
}

@Schema({
  timestamps: true,
  collection: 'notifications',
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class Notification extends Document {
  @Prop({
    type: String,
    required: true,
    index: true
  })
  userId: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(NotificationType)
  })
  type: NotificationType;

  @Prop({
    type: String,
    required: false
  })
  actorId: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ContentType)
  })
  contentType: ContentType;

  @Prop({
    type: String,
    required: false
  })
  contentId: string;

  @Prop({
    type: String,
    required: true
  })
  title: string;

  @Prop({
    type: String,
    required: true
  })
  body: string;

  @Prop({
    type: Boolean,
    default: false,
    index: true
  })
  read: boolean;

  @Prop({
    type: Object,
    default: {}
  })
  metadata: Record<string, any>;

  @Prop({
    type: Date,
    default: Date.now,
    index: true
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now
  })
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

// TTL index for automatic expiration after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
