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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlockService } from './block.service';
import {
  CreateBlockDto,
  BlockedUsersQueryDto,
} from './block.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/user.entity';

@ApiTags('blocks')
@Controller('blocks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post()
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User has been blocked',
  })
  blockUser(
    @GetUser() user: User, 
    @Body() createBlockDto: CreateBlockDto
  ) {
    return this.blockService.blockUser(user, createBlockDto);
  }

  @Delete(':blockedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User has been unblocked',
  })
  unblockUser(
    @GetUser() user: User, 
    @Param('blockedId') blockedId: string
  ) {
    return this.blockService.unblockUser(user, blockedId);
  }

  @Get()
  @ApiOperation({ summary: 'Get users blocked by the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns blocked users',
  })
  getBlockedUsers(
    @GetUser() user: User,
    @Query() queryDto: BlockedUsersQueryDto
  ) {
    return this.blockService.getBlockedUsers(user.id, queryDto);
  }

  @Get('status/:targetUserId')
  @ApiOperation({ summary: 'Get block status with another user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the block relationship status between users',
  })
  getBlockStatus(
    @GetUser() user: User,
    @Param('targetUserId') targetUserId: string
  ) {
    return this.blockService.getBlockStatus(user.id, targetUserId);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get blocked users count' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the number of users blocked by the current user',
  })
  getBlockedCount(@GetUser() user: User) {
    return this.blockService.getBlockedCount(user.id);
  }

  @Get('impact')
  @ApiOperation({ summary: 'Get block impact data for content filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns user IDs that should be excluded from content',
  })
  getBlockImpact(@GetUser() user: User) {
    return this.blockService.getBlockImpact(user.id);
  }
}
