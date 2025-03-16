import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from './dto/user-response.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserStatus } from './enums/user-status.enum';
import { CreateUserDto } from 'src/dto/users.dto';
import { UpdateUserDto } from 'src/dto/users.dto';
import { UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if username is already taken
    const existingUsername = await this.userModel.findOne({ 
      username: createUserDto.username 
    }).exec();
    
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Check if email is already registered
    const existingEmail = await this.userModel.findOne({ 
      email: createUserDto.email 
    }).exec();
    
    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // Create new user with displayName defaulting to username if not provided
    const newUser = new this.userModel({
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash,
      displayName: createUserDto.displayName || createUserDto.username,
      walletAddresses: createUserDto.walletAddress ? [createUserDto.walletAddress] : [],
      primaryWalletAddress: createUserDto.walletAddress || null,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await newUser.save();
    return new UserResponseDto(savedUser.toObject());
  }

  /**
   * Find all users with pagination
   */
  async findAll(page = 1, limit = 10): Promise<{ users: UserResponseDto[], total: number, page: number, pages: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      this.userModel.find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments().exec(),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      users: users.map(user => new UserResponseDto(user.toObject())),
      total,
      page,
      pages,
    };
  }

  /**
   * Find one user by ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return new UserResponseDto(user.toObject());
  }

  /**
   * Get user profile by username
   */
  async getProfile(username: string, currentUserId?: string): Promise<UserProfileDto> {
    const user = await this.userModel.findOne({ username }).exec();
    
    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    // Check if the current user has this user in their contacts
    let isContact = false;
    if (currentUserId) {
      const currentUser = await this.userModel.findById(currentUserId).exec();
      if (currentUser) {
        isContact = currentUser.contacts.includes(user._id.toString());
      }
    }

    // Convert to object and add the isContact flag
    const userObj = user.toObject();
    userObj.isContact = isContact;
    
    return new UserProfileDto(userObj);
  }

  /**
   * Update a user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // If updating wallet address, add it to the array if not already present
    if (updateUserDto.walletAddress) {
      if (!user.walletAddresses.includes(updateUserDto.walletAddress)) {
        user.walletAddresses.push(updateUserDto.walletAddress);
      }
      user.primaryWalletAddress = updateUserDto.walletAddress;
    }

    // Update other fields
    if (updateUserDto.displayName) user.displayName = updateUserDto.displayName;
    if (updateUserDto.bio !== undefined) user.bio = updateUserDto.bio;
    if (updateUserDto.avatarUrl !== undefined) user.avatarUrl = updateUserDto.avatarUrl;
    if (updateUserDto.status) user.status = updateUserDto.status;

    // Update settings if provided
    if (updateUserDto.settings) {
      // Update notifications settings
      if (updateUserDto.settings.notifications) {
        Object.assign(user.settings.notifications, updateUserDto.settings.notifications);
      }

      // Update privacy settings
      if (updateUserDto.settings.privacy) {
        Object.assign(user.settings.privacy, updateUserDto.settings.privacy);
      }

      // Update other settings
      if (updateUserDto.settings.theme) user.settings.theme = updateUserDto.settings.theme;
      if (updateUserDto.settings.language) user.settings.language = updateUserDto.settings.language;
    }

    const updatedUser = await user.save();
    return new UserResponseDto(updatedUser.toObject());
  }

  /**
   * Delete a user
   */
  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    // Soft delete by setting status to DELETED
    user.status = UserStatus.DELETED;
    await user.save();
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string): Promise<{ available: boolean }> {
    const user = await this.userModel.findOne({ username }).exec();
    return { available: !user };
  }

  /**
   * Find user by wallet address
   */
  async findByWalletAddress(walletAddress: string): Promise<UserResponseDto> {
    const user = await this.userModel.findOne({ 
      walletAddresses: walletAddress 
    }).exec();
    
    if (!user) {
      throw new NotFoundException(`User with wallet address ${walletAddress} not found`);
    }
    
    return new UserResponseDto(user.toObject());
  }

  /**
   * Associate wallet address with user
   */
  async associateWalletAddress(userId: string, walletAddress: string): Promise<UserResponseDto> {
    // Check if wallet is already associated with another user
    const existingUser = await this.userModel.findOne({ 
      walletAddresses: walletAddress 
    }).exec();
    
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictException('Wallet address is already associated with another user');
    }

    const user = await this.userModel.findById(userId).exec();
    
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Add wallet address if not already present
    if (!user.walletAddresses.includes(walletAddress)) {
      user.walletAddresses.push(walletAddress);
    }
    
    // Set as primary if no primary is set
    if (!user.primaryWalletAddress) {
      user.primaryWalletAddress = walletAddress;
    }

    const updatedUser = await user.save();
    return new UserResponseDto(updatedUser.toObject());
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(
      userId,
      { lastSeen: new Date() }
    ).exec();
  }

  /**
   * Search users by username, display name, or wallet address
   */
  async searchUsers(query: string, page = 1, limit = 10): Promise<{ users: UserResponseDto[], total: number, page: number, pages: number }> {
    const skip = (page - 1) * limit;
    
    // Create search regex (case insensitive)
    const searchRegex = new RegExp(query, 'i');
    
    const [users, total] = await Promise.all([
      this.userModel.find({
        $or: [
          { username: searchRegex },
          { displayName: searchRegex },
          { walletAddresses: query } // Exact match for wallet address
        ],
        status: { $ne: UserStatus.DELETED } // Exclude deleted users
      })
        .skip(skip)
        .limit(limit)
        .sort({ username: 1 })
        .exec(),
      this.userModel.countDocuments({
        $or: [
          { username: searchRegex },
          { displayName: searchRegex },
          { walletAddresses: query }
        ],
        status: { $ne: UserStatus.DELETED }
      }).exec(),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      users: users.map(user => new UserResponseDto(user.toObject())),
      total,
      page,
      pages,
    };
  }
}