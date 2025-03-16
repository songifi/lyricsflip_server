
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from '../authentication/guards/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateFollowDto } from '../dto/create-follow.dto';
import { UpdateFollowStatusDto } from '../dto/update-follow-status.dto';
import { FollowQueryDto } from '../dto/follow-query.dto';
import { Follow, FollowStatus } from '../schemas/follow.schema';

@ApiTags('follows')
@Controller('follows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post()
  @ApiOperation({ summary: 'Follow a user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The follow relationship has been created',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Follow relationship already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User to follow not found',
  })
  async followUser(
    @CurrentUser('sub') userId: string,
    @Body() createFollowDto: CreateFollowDto,
  ) {
    return this.followService.createFollow(userId, createFollowDto);
  }

  @Delete(':followeeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'followeeId', description: 'ID of the user to unfollow' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Successfully unfollowed the user',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Follow relationship not found',
  })
  async unfollowUser(
    @CurrentUser('sub') userId: string,
    @Param('followeeId') followeeId: string,
  ) {
    await this.followService.unfollow(userId, followeeId);
  }

  @Patch(':followId')
  @ApiOperation({ summary: 'Update follow status (accept/reject/block)' })
  @ApiParam({ name: 'followId', description: 'ID of the follow relationship' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Follow status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Follow relationship not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this follow relationship',
  })
  async updateFollowStatus(
    @CurrentUser('sub') userId: string,
    @Param('followId') followId: string,
    @Body() updateFollowStatusDto: UpdateFollowStatusDto,
  ) {
    return this.followService.updateFollowStatus(
      userId,
      followId,
      updateFollowStatusDto,
    );
  }

  @Get('followers')
  @ApiOperation({ summary: 'Get users who follow the current user' })
  @ApiQuery({ type: FollowQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of followers retrieved successfully',
  })
  async getMyFollowers(
    @CurrentUser('sub') userId: string,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getFollowers(userId, query);
  }

  @Get('following')
  @ApiOperation({ summary: 'Get users that the current user follows' })
  @ApiQuery({ type: FollowQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of followed users retrieved successfully',
  })
  async getMyFollowing(
    @CurrentUser('sub') userId: string,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getFollowing(userId, query);
  }

  @Get('pending-requests')
  @ApiOperation({ summary: 'Get pending follow requests for the current user' })
  @ApiQuery({ type: FollowQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of pending follow requests retrieved successfully',
  })
  async getPendingRequests(
    @CurrentUser('sub') userId: string,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getPendingRequests(userId, query);
  }

  @Get('users/:userId/followers')
  @ApiOperation({ summary: 'Get followers of a specific user' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ type: FollowQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of followers retrieved successfully',
  })
  async getUserFollowers(
    @Param('userId') userId: string,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getFollowers(userId, query);
  }

  @Get('users/:userId/following')
  @ApiOperation({ summary: 'Get users that a specific user follows' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ type: FollowQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of followed users retrieved successfully',
  })
  async getUserFollowing(
    @Param('userId') userId: string,
    @Query() query: FollowQueryDto,
  ) {
    return this.followService.getFollowing(userId, query);
  }

  @Get('check/:followeeId')
  @ApiOperation({ summary: 'Check if current user follows a specific user' })
  @ApiParam({ name: 'followeeId', description: 'ID of the user to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Follow status checked successfully',
  })
  async checkFollowStatus(
    @CurrentUser('sub') userId: string,
    @Param('followeeId') followeeId: string,
  ) {
    const isFollowing = await this.followService.isFollowing(
      userId,
      followeeId,
    );
    return { isFollowing };
  }
}
