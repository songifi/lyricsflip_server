// schemas/comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum CommentStatus {
  ACTIVE = 'active',
  FLAGGED = 'flagged',
  DELETED = 'deleted',
}

export enum ContentType {
  SONG = 'song',
  PLAYLIST = 'playlist',
  ALBUM = 'album',
  ARTIST = 'artist',
  USER = 'user',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      return ret;
    },
  },
})
export class Comment extends Document {
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(ContentType),
    index: true,
  })
  contentType!: ContentType;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
    index: true,
  })
  contentId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Comment',
    default: null,
    index: true,
  })
  parentId!: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 1000,
  })
  text!: string;

  @Prop({
    type: String,
    enum: Object.values(CommentStatus),
    default: CommentStatus.ACTIVE,
    index: true,
  })
  status!: CommentStatus;

  @Prop({
    type: Number,
    default: 0,
  })
  depth!: number;

  @Prop({
    type: Date,
    default: Date.now,
  })
  createdAt!: Date;

  @Prop({
    type: Date,
    default: Date.now,
  })
  updatedAt!: Date;
}
export const CommentSchema = SchemaFactory.createForClass(Comment);

// Create compound indexes for efficient querying
CommentSchema.index({ contentType: 1, contentId: 1, createdAt: -1 });
CommentSchema.index({ contentType: 1, contentId: 1, parentId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });

// Virtual for getting children (replies)
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
});