/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  })
  username!: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  password!: string;

  @Prop({
    type: [String],
    enum: Object.values(UserRole),
    default: [UserRole.USER],
  })
  roles?: UserRole[];

  @Prop({
    type: String,
    enum: Object.values(AccountStatus),
    default: AccountStatus.PENDING,
  })
  accountStatus!: AccountStatus;

  @Prop({
    default: 0,
  })
  failedLoginAttempts!: number;

  @Prop({
    default: null,
  })
  lastFailedLogin!: Date;

  @Prop()
  lastLogin!: Date;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Index for efficient queries
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });

// Add methods
export interface IUser extends UserDocument {
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
}

// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to check if account is locked
UserSchema.methods.isLocked = function (): boolean {
  // If there are too many failed attempts and the last failure was recent
  const MAX_FAILED_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

  if (
    this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS &&
    this.lastFailedLogin instanceof Date
  ) {
    const lockExpires = new Date(this.lastFailedLogin.getTime() + LOCK_TIME);
    return lockExpires > new Date();
  }
  return false;
};

// Add password comparison method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};
