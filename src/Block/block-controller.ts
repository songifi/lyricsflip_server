// src/modules/block/block.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BlockService } from './block.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateBlockDto } from './dto/create-block.dto';
import { BlockQueryDto } from './dto/block-query.dto';

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
    description: 'User blocked successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot block yourself',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User to block not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already blocked',
  })
  async blockUser(
    @CurrentUser('sub') userId: string,
    @Body() createBlockDto: CreateBlockDto,
  ) {
    return this.blockService.blockUser(userId, createBlockDto);
  }

  @Delete(':blockedId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'blockedId', description: 'ID of the user to unblock' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User unblocked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Block relationship not found',
  })
  async unblockUser(
    @CurrentUser('sub') userId: string,
    @Param('blockedId') blockedId: string,
  ) {
    await this.blockService.unblockUser(userId, blockedId);
  }

  @Get()
  @ApiOperation({ summary: 'Get users blocked by current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of blocked users retrieved successfully',
  })
  async getBlockedUsers(
    @CurrentUser('sub') userId: string,
    @Query() query: BlockQueryDto,
  ) {
    return this.blockService.getBlockedUsers(userId, query);
  }

  @Get('check/:userId')
  @ApiOperation({ summary: 'Check if a user is blocked by current user' })
  @ApiParam({ name: 'userId', description: 'ID of the user to check' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block status checked successfully',
  })
  async checkBlockStatus(
    @CurrentUser('sub') userId: string,
    @Param('userId') checkUserId: string,
  ) {
    const isBlocked = await this.blockService.isUserBlocked(userId, checkUserId);
    return { isBlocked };
  }

  @Get('check-blocked-by/:userId')
  @ApiOperation({ summary: 'Check if current user is blocked by another user' })
  @ApiParam({ name: 'userId', description: 'ID of the user to check if they blocked current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Block status checked successfully',
  })
  async checkBlockedByStatus(
    @CurrentUser('sub') userId: string,
    @Param('userId') otherUserId: string,
  ) {
    const isBlockedBy = await this.blockService.isBlockedBy(userId, otherUserId);
    return { isBlockedBy };
  }
}
