// File: src/modules/player/schemas/player.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum PlayerStatus {
  JOINED = 'joined',
  READY = 'ready',
  ACTIVE = 'active',
  SPECTATING = 'spectating',
  LEFT = 'left'
}

export interface Answer {
  questionId: string;
  value: any;
  isCorrect: boolean;
  timeToAnswer: number; // in ms
  pointsEarned: number;
  submittedAt: Date;
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
export class Player {
  @ApiProperty({ description: 'User ID who is playing' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  })
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Game session ID' })
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'GameSession',
    required: true,
    index: true
  })
  sessionId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ enum: PlayerStatus, description: 'Current status of the player' })
  @Prop({
    type: String,
    enum: PlayerStatus,
    default: PlayerStatus.JOINED,
    index: true
  })
  status: PlayerStatus;

  @ApiProperty({ description: 'When the player joined the session' })
  @Prop({ type: Date, default: Date.now })
  joinedAt: Date;

  @ApiProperty({ description: 'Current player score' })
  @Prop({ type: Number, default: 0, min: 0 })
  score: number;

  @ApiProperty({ description: 'Player position in the leaderboard' })
  @Prop({ type: Number, default: 0 })
  position: number;

  @ApiProperty({ description: 'Time player was active in the session (seconds)' })
  @Prop({ type: Number, default: 0, min: 0 })
  activeTime: number;
  
  @ApiProperty({ description: 'Last activity timestamp' })
  @Prop({ type: Date })
  lastActive: Date;

  @ApiProperty({ description: 'Player's answers to questions' })
  @Prop({
    type: [{
      questionId: { type: MongooseSchema.Types.ObjectId, ref: 'Question' },
      value: { type: MongooseSchema.Types.Mixed },
      isCorrect: { type: Boolean },
      timeToAnswer: { type: Number, min: 0 },
      pointsEarned: { type: Number, default: 0 },
      submittedAt: { type: Date, default: Date.now }
    }],
    default: []
  })
  answers: Answer[];

  @ApiProperty({ description: 'Number of correct answers' })
  @Prop({ type: Number, default: 0, min: 0 })
  correctAnswers: number;

  @ApiProperty({ description: 'Custom properties for the player' })
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export type PlayerDocument = Player & Document;
export const PlayerSchema = SchemaFactory.createForClass(Player);

// Create compound indexes for efficient querying
PlayerSchema.index({ sessionId: 1, status: 1 });
PlayerSchema.index({ sessionId: 1, score: -1 }); // For leaderboard
PlayerSchema.index({ sessionId: 1, userId: 1 }, { unique: true }); // Prevent duplicate players in session
PlayerSchema.index({ userId: 1, joinedAt: -1 }); // For player history

// Add virtual for user data
PlayerSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Add virtual for session data
PlayerSchema.virtual('session', {
  ref: 'GameSession',
  localField: 'sessionId',
  foreignField: '_id',
  justOne: true
});