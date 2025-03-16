// src/modules/follow/schemas/follow.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from './user.schema';

export enum FollowStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

@Schema({ timestamps: true })
export class Follow extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  followerId: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  followeeId: User;

  @Prop({
    type: String,
    enum: Object.values(FollowStatus),
    default: FollowStatus.PENDING,
    required: true,
  })
  status: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);

// Create a compound index for fast lookup of specific relationships
FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });