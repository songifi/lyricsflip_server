/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  BadRequestException,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { CreateUserDto} from 'src/dto/users.dto';
import { UpdateUserDto } from 'src/dto/users.dto';
import { JwtAuthGuard } from 'src/authentication/guards/jwt.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully created',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Username or email already exists',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starting from 1)',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    pages: number;
  }> {
    // Validate pagination parameters
    if (page < 1) {
      throw new BadRequestException(
        'Page should be greater than or equal to 1',
      );
    }
    if (limit < 1 || limit > 100) {
      throw new BadRequestException('Limit should be between 1 and 100');
    }

    return this.userService.findAll(page, limit);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search users by username, display name or wallet address',
  })
  @ApiQuery({ name: 'query', required: true, description: 'Search query' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starting from 1)',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
  })
  async searchUsers(
    @Query('query') query: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    pages: number;
  }> {
    if (!query || query.trim() === '') {
      throw new BadRequestException('Search query cannot be empty');
    }

    return this.userService.searchUsers(query, page, limit);
  }

  @Get('check-username/:username')
  @ApiOperation({ summary: 'Check if a username is available' })
  @ApiParam({ name: 'username', description: 'Username to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Username availability checked',
    type: Object,
  })
  async checkUsername(
    @Param('username') username: string,
  ): Promise<{ available: boolean }> {
    return this.userService.isUsernameAvailable(username);
  }

  @Get('wallet/:walletAddress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find a user by wallet address' })
  @ApiParam({ name: 'walletAddress', description: 'Wallet address to find' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User found',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async findByWalletAddress(
    @Param('walletAddress') walletAddress: string,
  ): Promise<UserResponseDto> {
    return this.userService.findByWalletAddress(walletAddress);
  }

  @Get('profile/:username')
  @ApiOperation({ summary: 'Get a user profile by username' })
  @ApiParam({ name: 'username', description: 'Username to find' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    type: UserProfileDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getProfile(
    @Param('username') username: string,
    @Request() req,
  ): Promise<UserProfileDto> {
    // Extract current user ID from JWT if available
    const currentUserId = req.user?.userId;
    return this.userService.getProfile(username, currentUserId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ): Promise<UserResponseDto> {
    // Ensure users can only update their own profile (unless admin)
    if (req.user.userId !== id && req.user.role !== 'admin') {
      throw new BadRequestException('You can only update your own profile');
    }

    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (soft delete)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    // Ensure users can only delete their own account (unless admin)
    if (req.user.userId !== id && req.user.role !== 'admin') {
      throw new BadRequestException('You can only delete your own account');
    }

    return this.userService.remove(id);
  }

  @Post(':id/wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Associate a wallet address with user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Wallet address associated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Wallet address already associated with another user',
  })
  async associateWallet(
    @Param('id') id: string,
    @Body() body: { walletAddress: string },
    @Request() req,
  ): Promise<UserResponseDto> {
    // Ensure users can only update their own wallet (unless admin)
    if (req.user.userId !== id && req.user.role !== 'admin') {
      throw new BadRequestException('You can only update your own wallet');
    }

    return this.userService.associateWalletAddress(id, body.walletAddress);
  }
}