import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FollowService } from './follow.service';
import {
  FollowUserDto,
  UnfollowUserDto,
  FollowRequestResponseDto,
  FollowListQueryDto,
  PendingRequestsQueryDto,
  FollowSuggestionsQueryDto,
} from './follow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/user.entity';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Follow } from './follow.entity';
import { FollowRequest } from './follow-request.entity';

@ApiTags('follows')
@Controller('follows')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post()
  @ApiOperation({ summary: 'Follow a user or send a follow request' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User has been followed or follow request sent',
  })
  follow(
    @GetUser() user: User, 
    @Body() followDto: FollowUserDto
  ): Promise<Follow | FollowRequest> {
    return this.followService.followUser(user, followDto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User has been unfollowed',
  })
  unfollow(
    @GetUser() user: User, 
    @Body() unfollowDto: UnfollowUserDto
  ): Promise<void> {
    return this.followService.unfollowUser(user, unfollowDto);
  }

  @Delete('requests/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a follow request' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Follow request has been canceled',
  })
  cancelRequest(
    @GetUser() user: User, 
    @Param('userId') targetUserId: string
  ): Promise<void> {
    return this.followService.cancelFollowRequest(user, targetUserId);
  }

  @Post('requests/respond')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Respond to a follow request' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Response to follow request has been processed',
  })
  respondToRequest(
    @GetUser() user: User, 
    @Body() responseDto: FollowRequestResponseDto
  ): Promise<void> {
    return this.followService.respondToFollowRequest(user, responseDto);
  }

  @Get('followers/:userId')
  @ApiOperation({ summary: 'Get followers of a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns followers of the user',
  })
  async getFollowers(
    @GetUser() currentUser: User,
    @Param('userId') userId: string,
    @Query() queryDto: FollowListQueryDto
  ) {
    // Check if user is private and not followed by the current user
    const targetUser = await this.userService.findById(userId);
    
    if (
      targetUser.isPrivate && 
      userId !== currentUser.id && 
      !(await this.followService.isFollowing(currentUser.id, userId))
    ) {
      throw new ForbiddenException('This user has a private account');
    }
    
    return this.followService.getFollowers(userId, queryDto);
  }

  @Get('following/:userId')
  @ApiOperation({ summary: 'Get users that a user is following' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns users that the specified user is following',
  })
  async getFollowing(
    @GetUser() currentUser: User,
    @Param('userId') userId: string,
    @Query() queryDto: FollowListQueryDto
  ) {
    // Check if user is private and not followed by the current user
    const targetUser = await this.userService.findById(userId);
    
    if (
      targetUser.isPrivate && 
      userId !== currentUser.id && 
      !(await this.followService.isFollowing(currentUser.id, userId))
    ) {
      throw new ForbiddenException('This user has a private account');
    }
    
    return this.followService.getFollowing(userId, queryDto);
  }

  @Get('requests/received')
  @ApiOperation({ summary: 'Get follow requests received by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns follow requests received by the current user',
  })
  getReceivedRequests(
    @GetUser() user: User,
    @Query() queryDto: PendingRequestsQueryDto
  ) {
    return this.followService.getReceivedRequests(user.id, queryDto);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get follow requests sent by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns follow requests sent by the current user',
  })
  getSentRequests(
    @GetUser() user: User,
    @Query() queryDto: PendingRequestsQueryDto
  ) {
    return this.followService.getSentRequests(user.id, queryDto);
  }

  @Get('status/:targetUserId')
  @ApiOperation({ summary: 'Get follow status with another user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the follow relationship status between users',
  })
  getFollowStatus(
    @GetUser() user: User,
    @Param('targetUserId') targetUserId: string
  ) {
    return this.followService.getFollowStatus(user.id, targetUserId);
  }

  @Get('counts/:userId')
  @ApiOperation({ summary: 'Get follower and following counts for a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns follower and following counts',
  })
  getFollowCounts(@Param('userId') userId: string) {
    return this.followService.getFollowCounts(userId);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get follow suggestions for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns suggested users to follow',
  })
  getFollowSuggestions(
    @GetUser() user: User,
    @Query() queryDto: FollowSuggestionsQueryDto
  ) {
    return this.followService.getFollowSuggestions(user.id, queryDto);
  }
  
  @Post('counts/refresh/:userId')
  @ApiOperation({ summary: 'Refresh follow counts for a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Follow counts have been refreshed',
  })
  refreshFollowCounts(
    @GetUser() user: User,
    @Param('userId') userId: string
  ) {
    // Only allow users to refresh their own counts or admins
    if (user.id !== userId && !user.isAdmin) {
      throw new ForbiddenException('You can only refresh your own follow counts');
    }
    
    return this.followService.refreshFollowCounts(userId);
  }
}
