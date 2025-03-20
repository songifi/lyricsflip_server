import { 
  Injectable, 
  NotFoundException, 
  BadRequestException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, IUser } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<IUser>) {}

  /**
   * Create a new user
   * @param createUserDto - User data transfer object
   * @returns Created user
   * @throws BadRequestException if email or username already exists
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user with given email or username exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email: createUserDto.email }, { username: createUserDto.username }],
    });

    if (existingUser) {
      throw new BadRequestException('Email or Username already exists');
    }

    // Hash password before saving user
    const salt = await bcrypt.genSalt(10);
    createUserDto.password = await bcrypt.hash(createUserDto.password, salt);

    // Create and save new user
    const user = new this.userModel(createUserDto);
    return user.save();
  }

  /**
   * Retrieve all users
   * @returns List of users
   */
  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns User details
   * @throws NotFoundException if user is not found
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Update user details
   * @param id - User ID
   * @param updateUserDto - Updated user data
   * @returns Updated user
   * @throws NotFoundException if user is not found
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Delete a user by ID
   * @param id - User ID
   * @returns Deleted user
   * @throws NotFoundException if user is not found
   */
  async remove(id: string): Promise<User> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns User details or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Update user's refresh token (used for authentication)
   * @param userId - User ID
   * @param refreshToken - New refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const salt = await bcrypt.genSalt(10);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);

    await this.userModel.findByIdAndUpdate(userId, { refreshTokens: [hashedRefreshToken] });
  }

  /**
   * Validate user by refresh token
   * @param refreshToken - Refresh token to validate
   * @returns User details if valid, otherwise null
   */
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const users = await this.userModel.find().select('+refreshTokens').exec();
    for (const user of users) {
      if (await bcrypt.compare(refreshToken, user.refreshTokens[0])) {
        return user;
      }
    }
    return null;
  }

  /**
   * Invalidate a user's refresh token (logout)
   * @param userId - User ID
   */
  async invalidateRefreshToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshTokens: [] });
  }
}
