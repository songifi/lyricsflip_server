import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum ActivityType {
  FOLLOW = 'follow',
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  GAME_PLAYED = 'game_played'
}

export enum ContentType {
  POST = 'post',
  PHOTO = 'photo',
  USER = 'user',
  COMMENT = 'comment',
  GAME = 'game'
}

@Schema({ 
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class Activity {
  @ApiProperty({ description: 'User who performed the activity' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  })
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ 
    enum: ActivityType, 
    description: 'Type of activity performed' 
  })
  @Prop({ 
    type: String, 
    enum: ActivityType, 
    required: true,
    index: true 
  })
  activityType: ActivityType;

  @ApiProperty({ 
    enum: ContentType, 
    description: 'Type of content the activity is related to' 
  })
  @Prop({ 
    type: String, 
    enum: ContentType, 
    required: true 
  })
  contentType: ContentType;

  @ApiProperty({ description: 'ID of the related content' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    required: true,
    index: true 
  })
  contentId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ 
    description: 'Rich metadata specific to activity type',
    type: 'object',
    additionalProperties: true
  })
  @Prop({ 
    type: MongooseSchema.Types.Mixed, 
    default: {} 
  })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}

export type ActivityDocument = Activity & Document;
export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Create compound indexes for efficient querying
ActivitySchema.index({ userId: 1, createdAt: -1 }); // User activity feed
ActivitySchema.index({ contentId: 1, activityType: 1 }); // Content-specific activity queries
ActivitySchema.index({ activityType: 1, createdAt: -1 }); // Activity type-based feeds
ActivitySchema.index({ contentType: 1, contentId: 1, createdAt: -1 }); // Content-specific timeline
