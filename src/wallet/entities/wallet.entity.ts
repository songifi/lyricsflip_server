import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum WalletStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
  }
  @Schema({ timestamps: true })
  export class Wallet extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: string;
  
    @Prop({ type: [String], required: true, unique: true })
    address: string[];
  
    @Prop({ type: Number, required: true, default: 0 })
    balance: number;
  
    @Prop({ type: String, enum: WalletStatus, default: WalletStatus.ACTIVE })
    status: WalletStatus;

    @Prop({ default: Date.now() })
    createdAt: Date;  
    
    }
  
  export const WalletSchema = SchemaFactory.createForClass(Wallet);
  