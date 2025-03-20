// src/modules/player/schemas/player.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from '../../user/schemas/user.schema';
import { GameSession } from '../../game-session/schemas/game-session.schema';

export enum PlayerStatus {
  NOT_READY = 'not_ready',
  READY = 'ready',
  ACTIVE = 'active',
  SPECTATING = 'spectating',
  DISCONNECTED = 'disconnected',
  LEFT = 'left',
  KICKED = 'kicked',
}

@Schema()
export class Player extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: User;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'GameSession',
    required: true,
    index: true,
  })
  sessionId: GameSession;

  @Prop({
    type: String,
    enum: Object.values(PlayerStatus),
    default: PlayerStatus.NOT_READY,
  })
  status: PlayerStatus;

  @Prop({
    type: Boolean,
    default: false,
  })
  isSpectator: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  score: number;

  @Prop({
    type: String,
    default: null,
  })
  socketId: string;

  @Prop({
    type: Date,
    required: true,
  })
  joinedAt: Date;

  @Prop({
    type: Date,
    required: true,
  })
  updatedAt: Date;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);

// Create indexes for common queries
PlayerSchema.index({ sessionId: 1, status: 1 });
PlayerSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
PlayerSchema.index({ socketId: 1 }, { sparse: true });
