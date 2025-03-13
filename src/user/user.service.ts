import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser, User, AccountStatus } from '../schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from '../dto/users.dto';

@Injectable()
export class UserService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_TIME = 30 * 60 * 1000; // 30 minutes

  constructor(@InjectModel(User.name) private userModel: Model<IUser>) {}

  async create(createUserDto: CreateUserDto): Promise<any> {
    // Check if username or email already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new HttpException(
        'Username or email already exists',
        HttpStatus.CONFLICT,
      );
    }

    // Create new user
    const newUser = new this.userModel({
      ...createUserDto,
      accountStatus: AccountStatus.PENDING,
    });

    const savedUser = await newUser.save();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, failedLoginAttempts, lastFailedLogin, ...result } =
      savedUser.toObject(); // Remove password from the result object

    // Return user
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<IUser> {
    // Check if username or email already exists
    if (updateUserDto.username || updateUserDto.email) {
      const existingUser = await this.userModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateUserDto.username
            ? [{ username: updateUserDto.username }]
            : []),
          ...(updateUserDto.email ? [{ email: updateUserDto.email }] : []),
        ],
      });

      if (existingUser) {
        throw new HttpException(
          'Username or email already exists',
          HttpStatus.CONFLICT,
        );
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateUserDto },
      { new: true },
    );

    if (!updatedUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return updatedUser;
  }

  async findById(id: string): Promise<IUser> {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).select('+password');

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      throw new HttpException(
        'Current password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Update password
    user.password = newPassword;
    await user.save();
  }
}
