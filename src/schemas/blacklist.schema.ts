import { Schema, Document, model } from 'mongoose';

export interface BlacklistedToken extends Document {
  token: string;
  expiresAt: Date;
}

export const BlacklistSchema = new Schema<BlacklistedToken>({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

export const BlacklistModel = model<BlacklistedToken>(
  'Blacklist',
  BlacklistSchema,
);
