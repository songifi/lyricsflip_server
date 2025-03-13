/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Version,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
} from '../dto/users.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @Version('1')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully created.',
    type: CreateUserDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(@Body() createUserDto: CreateUserDto): Promise<any> {
    try {
      const user = await this.userService.create(createUserDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'User registered successfully',
        data: user,
      };
    } catch (error: any) {
      console.log('error_______', error);
      if (
        error instanceof HttpException &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        error.getStatus() === HttpStatus.CONFLICT
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to register user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/profile-update')
  @Version('1')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile successfully updated.',
    type: UpdateUserDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async update(
    @Param('id') id: string,
    @Body() createUserDto: CreateUserDto,
  ): Promise<any> {
    try {
      const user = await this.userService.update(id, createUserDto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'User registered successfully',
        data: user,
      };
    } catch (error: any) {
      if (
        error instanceof HttpException &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
        error.getStatus() === HttpStatus.CONFLICT
      ) {
        throw error;
      }
      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({
    name: 'id',
    description: 'The user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the user.',
    type: CreateUserDto,
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findOne(@Param('id') id: string): Promise<any> {
    try {
      const user = await this.userService.findById(id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return {
        statusCode: HttpStatus.OK,
        data: user,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/change-password')
  @Version('1')
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({
    status: 200,
    description: 'User password successfully updated.',
    type: UpdateUserDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<any> {
    try {
      if (
        changePasswordDto.confirmPassword === changePasswordDto.currentPassword
      ) {
        throw new HttpException(
          'New password cannot be same as old password',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate password confirmation
      if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
        throw new HttpException(
          'Passwords do not match',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.userService.changePassword(
        id,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword,
      );

      return {
        statusCode: HttpStatus.OK,
        message: 'Password changed successfully',
      };
    } catch (error: any) {
      console.log('error_______', error);
      if (
        (error instanceof HttpException &&
          error.getStatus() === HttpStatus.UNAUTHORIZED) ||
        error.getStatus() === HttpStatus.BAD_REQUEST
      ) {
        throw error;
      }

      throw new HttpException(
        'Failed to change password',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
