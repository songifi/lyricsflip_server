// src/modules/round-answer/schemas/round-answer.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { GameRound } from '../../game-round/schemas/game-round.schema';
import { Player } from '../../player/schemas/player.schema';

@Schema({ timestamps: true })
export class RoundAnswer extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'GameRound',
    required: true,
    index: true,
  })
  roundId: GameRound;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Player',
    required: true,
    index: true,
  })
  playerId: Player;

  @Prop({
    type: String,
    required: true,
  })
  answer: string;

  @Prop({
    type: Date,
    default: Date.now,
    required: true,
  })
  submittedAt: Date;

  @Prop({
    type: Number,
    default: 0,
  })
  score: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  isCorrect: boolean;

  @Prop({
    type: Number,
    default: 0,
  })
  responseTimeMs: number;

  @Prop({
    type: Object,
    default: {},
  })
  metadata: Record<string, any>;
}

export const RoundAnswerSchema = SchemaFactory.createForClass(RoundAnswer);

// Create compound indexes for common queries
RoundAnswerSchema.index({ roundId: 1, playerId: 1 }, { unique: true }); // One answer per player per round
RoundAnswerSchema.index({ roundId: 1, submittedAt: 1 }); // For getting answers by submission time
RoundAnswerSchema.index({ playerId: 1, isCorrect: 1 }); // For player statistics
