import { Controller, Post, Delete, Param, Get, Body } from '@nestjs/common';
import { LikeService } from './likes.service';
import { CreateLikeDto } from './dto/create-like.dto';

@Controller('likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  // ✅ Like content
  @Post()
  async likeContent(@Body() createLikeDto: CreateLikeDto) {
    return this.likeService.likeContent(createLikeDto);
  }

  // ✅ Unlike content
  @Delete(':userId/:contentType/:contentId')
  async unlikeContent(
    @Param('userId') userId: string,
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
  ) {
    return this.likeService.unlikeContent(userId, contentType, contentId);
  }

  // ✅ Get total likes for a content
  @Get(':contentType/:contentId/count')
  async getTotalLikes(
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
  ) {
    return this.likeService.getTotalLikes(contentType, contentId);
  }

  // ✅ Check if a user has liked content
  @Get(':userId/:contentType/:contentId')
  async hasUserLiked(
    @Param('userId') userId: string,
    @Param('contentType') contentType: string,
    @Param('contentId') contentId: string,
  ) {
    return this.likeService.hasUserLiked(userId, contentType, contentId);
  }
}
