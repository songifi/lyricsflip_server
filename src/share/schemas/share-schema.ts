// src/modules/share/schemas/share.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

// Content types that can be shared
export enum ContentType {
  SONG = 'song',
  PLAYLIST = 'playlist',
  GAME_RESULT = 'game_result',
  PROFILE = 'profile',
  ALBUM = 'album',
}

// Target platforms where content can be shared
export enum TargetType {
  INTERNAL = 'internal', // Within the app
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  COPY_LINK = 'copy_link',
}

@Schema({ timestamps: true })
export class Share extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: User;

  @Prop({
    type: String,
    enum: Object.values(ContentType),
    required: true,
    index: true,
  })
  contentType: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    refPath: 'contentType',
    index: true,
  })
  contentId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(TargetType),
    required: true,
    index: true,
  })
  targetType: string;

  @Prop({
    type: String,
    required: function() {
      // targetId is required only for internal shares
      return this.targetType === TargetType.INTERNAL;
    },
  })
  targetId: string;

  @Prop({
    type: String,
    maxlength: 500,
  })
  message: string;

  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  createdAt: Date;

  // Additional metadata for analytics
  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const ShareSchema = SchemaFactory.createForClass(Share);

// Create compound indexes for common queries
ShareSchema.index({ userId: 1, createdAt: -1 }); // For finding user's shares
ShareSchema.index({ contentType: 1, contentId: 1 }); // For finding shares of specific content
ShareSchema.index({ contentType: 1, contentId: 1, targetType: 1 }); // For analytics
