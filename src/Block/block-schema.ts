// src/modules/block/schemas/block.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';

@Schema({ timestamps: true })
export class Block extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  blockerId: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  blockedId: User;

  @Prop({
    type: String,
    maxlength: 500,
    default: '',
  })
  reason: string;

  @Prop({
    type: Date,
    default: Date.now,
  })
  createdAt: Date;
}

export const BlockSchema = SchemaFactory.createForClass(Block);

// Create a compound index for efficient lookup of block relationships
BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
