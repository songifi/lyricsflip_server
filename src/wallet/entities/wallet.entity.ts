import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Wallet {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  address: string;

  @Prop({ default: 0 })
  balance: number;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: Date.now() })
  createdAt: Date;
}
export type WalletDocument = Wallet & Document;
export const WalletSchema = SchemaFactory.createForClass(Wallet);
