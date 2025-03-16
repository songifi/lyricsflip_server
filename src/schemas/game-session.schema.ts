import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from './user.schema';
import mongoose from 'mongoose';
import { SessionStatus } from 'src/enum/game-session.enum';

@Schema({ timestamps: true, autoIndex: true })
export class GameSession {
  @Prop({ required: true, index: true, unique: true })
  sessionId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  createdBy: User;

  @Prop({
    required: false,
    enum: SessionStatus,
    default: SessionStatus.Waiting,
  })
  status: SessionStatus;

  @Prop({ required: false })
  players: string[];

  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  config: Record<string, any>;

  @Prop({ required: false, default: Date.now, index: { expires: '1d' } })
  createdAt: Date;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);

// GameSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
