import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GameSessionDocument = GameSession & Document;

@Schema({ timestamps: true })
export class GameSession {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  host: string;

  @Prop({ required: true })
  roomCode: string;

  @Prop({ type: [String], default: [] })
  players: string[];

  @Prop({ default: {} })
  settings: Record<string, any>;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);