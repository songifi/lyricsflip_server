import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, IUser } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<IUser>) {}

  // Create a new user
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userModel.findOne({
      $or: [{ email: createUserDto.email }, { username: createUserDto.username }],
    });
    if (existingUser) {
      throw new BadRequestException('Email or Username already exists');
    }
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  // Find all users
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  // Find user by ID
  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Update user
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Delete user
  async remove(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // Store refresh token securely (hashed)
  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

    await this.userModel.findByIdAndUpdate(userId, { refreshTokens: [hashedRefreshToken] });
  }

  // Find user by refresh token (validating token)
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const users = await this.userModel.find().select('+refreshTokens').exec();
    for (const user of users) {
      if (await bcrypt.compare(refreshToken, user.refreshTokens[0])) {
        return user;
      }
    }
    return null;
  }

  // Invalidate refresh token (logout)
  async invalidateRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokens: [] });
  }
}
