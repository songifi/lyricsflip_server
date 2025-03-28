// src/likes/controllers/like.controller.ts
import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam, 
  ApiQuery 
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { LikeRepository } from '../repositories/like.repository';
import { Like } from '../entities/like.entity';
import { CreateLikeDto } from '../dto/create-like.dto';
import { LikeResponseDto } from '../dto/like-response.dto';
import { LikeFilterDto } from '../dto/like-filter.dto';
import { LikeStatsDto } from '../dto/like-stats.dto';
import { CheckLikeResponseDto } from '../dto/check-like-response.dto';
import { LikeableType } from '../enums/likeable-type.enum';
import { LikeService } from '../services/like.service';

@ApiTags('likes')
@Controller('likes')
export class LikeController {
  constructor(
    private readonly likeService: LikeService,
    private readonly likeRepository: LikeRepository,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like content' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Content liked successfully', 
    type: LikeResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'User has already liked this content' 
  })
  @RateLimit({ limit: 30, duration: 60 }) // 30 likes per minute
  async createLike(
    @Req() req,
    @Body() createLikeDto: CreateLikeDto,
  ): Promise<LikeResponseDto> {
    const userId = req.user.id;
    
    // Check if already liked
    const existingLike = await this.likeRepository.findByUserAndContent(
      userId,
      createLikeDto.likeableId,
      createLikeDto.likeableType,
    );
    
    if (existingLike) {
      throw new ConflictException('You have already liked this content');
    }
    
    return this.likeService.createLike(userId, createLikeDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike content' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Content unliked successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Like not found' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Like ID', 
    type: String 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ limit: 30, duration: 60 }) // 30 unlikes per minute
  async deleteLike(
    @Req() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.likeService.deleteLike(id, req.user.id);
  }

  @Delete('content/:type/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlike content by content ID and type' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Content unliked successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Like not found' 
  })
  @ApiParam({ 
    name: 'type', 
    description: 'Content type', 
    enum: LikeableType 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Content ID', 
    type: String 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlikeContent(
    @Req() req,
    @Param('type') type: LikeableType,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = req.user.id;
    const like = await this.likeRepository.findByUserAndContent(userId, id, type);
    
    if (!like) {
      throw new NotFoundException('You have not liked this content');
    }
    
    return this.likeService.deleteLike(like.id, userId);
  }

  @Get('check/:type/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if the current user has liked specific content' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Returns like status and count', 
    type: CheckLikeResponseDto 
  })
  @ApiParam({ 
    name: 'type', 
    description: 'Content type', 
    enum: LikeableType 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'Content ID', 
    type: String 
  })
  async checkLike(
    @Req() req,
    @Param('type') type: LikeableType,
    @Param('id') id: string,
  ): Promise<CheckLikeResponseDto> {
    const userId = req.user.id;
    const liked = await this.likeRepository.hasLiked(userId, id, type);
    const likesCount = await this.likeRepository.countLikes(id, type);
    
    return { liked, likesCount };
  }

  @Get('content/:type/:id')
  @ApiOperation({ summary: 'Get users who liked specific content' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description