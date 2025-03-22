// File: src/modules/comments/schemas/comment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

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
  POST = 'post',
}

@Schema({ 
  timestamps: true,
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
export class Comment {
  @ApiProperty({ description: 'User ID who created the comment' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  })
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ enum: ContentType, description: 'Type of content the comment is on' })
  @Prop({ 
    type: String, 
    enum: ContentType, 
    required: true,
    index: true
  })
  contentType: ContentType;

  @ApiProperty({ description: 'ID of the content the comment is on' })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    required: true,
    index: true
  })
  contentId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'ID of the parent comment (if this is a reply)', required: false })
  @Prop({ 
    type: MongooseSchema.Types.ObjectId, 
    ref: 'Comment',
    index: true,
    default: null
  })
  parentId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Comment text content' })
  @Prop({ 
    type: String, 
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 2000
  })
  text: string;

  @ApiProperty({ enum: CommentStatus, description: 'Current status of the comment' })
  @Prop({ 
    type: String, 
    enum: CommentStatus, 
    default: CommentStatus.ACTIVE,
    index: true
  })
  status: CommentStatus;

  @ApiProperty({ description: 'Number of likes on the comment' })
  @Prop({ type: Number, default: 0 })
  likesCount: number;

  @ApiProperty({ description: 'Number of replies to this comment' })
  @Prop({ type: Number, default: 0 })
  repliesCount: number;

  @ApiProperty({ description: 'Depth level of the comment (0 for top-level)' })
  @Prop({ type: Number, default: 0, min: 0, max: 5 }) // Limit depth to 5 levels
  depth: number;

  @ApiProperty({ description: 'Has this comment been edited' })
  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}

export type CommentDocument = Comment & Document;
export const CommentSchema = SchemaFactory.createForClass(Comment);

// Create compound indexes for efficient querying
CommentSchema.index({ contentType: 1, contentId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Virtual for populating user data
CommentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for replies
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { createdAt: 1 } }
});
