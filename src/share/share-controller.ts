// src/modules/share/share.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ShareService } from './share.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateShareDto } from './dto/create-share.dto';
import { QueryShareDto } from './dto/query-share.dto';
import { ContentType } from './schemas/share.schema';

@ApiTags('shares')
@Controller('shares')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new share' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The share has been successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or content not found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Content or target user not found',
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createShareDto: CreateShareDto,
  ) {
    return this.shareService.create(userId, createShareDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all shares based on query parameters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of shares retrieved successfully',
  })
  async findAll(@Query() queryShareDto: QueryShareDto) {
    return this.shareService.findAll(queryShareDto);
  }

  @Get('my-shares')
  @ApiOperation({ summary: 'Get shares created by the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user shares retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findMyShares(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shareService.findByUser(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific share by ID' })
  @ApiParam({ name: 'id', description: 'Share ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Share retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Share not found',
  })
  async findOne(@Param('id') id: string) {
    return this.shareService.findOne(id);
  }

  @Get('content/:contentType/:contentId')
  @ApiOperation({ summary: 'Get shares for specific content' })
  @ApiParam({ name: 'contentType', description: 'Type of content', enum: ContentType })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content shares retrieved successfully',
  })
  async findByContent(
    @Param('contentType') contentType: ContentType,
    @Param('contentId') contentId: string,
  ) {
    return this.shareService.findByContent(contentType, contentId);
  }

  @Get('analytics/:contentType/:contentId')
  @ApiOperation({ summary: 'Get share analytics for specific content' })
  @ApiParam({ name: 'contentType', description: 'Type of content', enum: ContentType })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Share analytics retrieved successfully',
  })
  async getAnalytics(
    @Param('contentType') contentType: ContentType,
    @Param('contentId') contentId: string,
  ) {
    return this.shareService.getAnalytics(contentType, contentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a share' })
  @ApiParam({ name: 'id', description: 'Share ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Share deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Share not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'User does not have permission to delete this share',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.shareService.remove(id, userId);
  }
}
