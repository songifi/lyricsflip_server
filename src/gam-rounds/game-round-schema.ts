import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import * as mongoose from 'mongoose';

export enum GameRoundStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export type GameRoundDocument = GameRound & Document;

@Schema({
  timestamps: true,
  collection: 'game_rounds',
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
})
export class GameRound {
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true
  })
  roundId: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameSession',
    required: true,
    index: true
  })
  sessionId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song',
    required: true,
    index: true
  })
  songId: mongoose.Types.ObjectId;

  @Prop({
    type: Date,
    default: null
  })
  startTime: Date;

  @Prop({
    type: Date,
    default: null
  })
  endTime: Date;

  @Prop({
    type: String,
    enum: Object.values(GameRoundStatus),
    default: GameRoundStatus.PENDING,
    index: true
  })
  status: GameRoundStatus;

  @Prop({
    type: Number,
    default: 0
  })
  roundNumber: number;

  @Prop({
    type: Number,
    default: 60,
    min: 10,
    max: 300
  })
  durationSeconds: number;

  @Prop({
    type: Number,
    default: 0
  })
  participantCount: number;

  @Prop({
    type: Number,
    default: 0
  })
  correctAnswerCount: number;

  @Prop({
    type: Object,
    default: {}
  })
  roundConfig: Record<string, any>;

  @Prop({
    type: Object,
    default: {}
  })
  metadata: Record<string, any>;

  @Prop({
    type: Date,
    default: Date.now
  })
  createdAt: Date;

  @Prop({
    type: Date,
    default: Date.now
  })
  updatedAt: Date;
}

export const GameRoundSchema = SchemaFactory.createForClass(GameRound);

// Add compound indexes for query optimization
GameRoundSchema.index({ sessionId: 1, status: 1 });
GameRoundSchema.index({ sessionId: 1, roundNumber: 1 });
GameRoundSchema.index({ status: 1, startTime: -1 });
