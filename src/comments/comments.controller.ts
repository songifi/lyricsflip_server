import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Param, 
    Put, 
    Delete, 
    Query, 
    Patch 
  } from '@nestjs/common';
  import { CommentsService } from './comments.service';
  import { CreateCommentDto } from '../dto/create-comment.dto';
  import { UpdateCommentDto } from '../dto/update-comment.dto';
  import { PaginationQueryDto } from '../dto/pagination-query-dto';
  import { ContentType, CommentStatus } from '../schemas/comment.schema';
  
  @Controller('comments')
  export class CommentsController {
    constructor(private readonly commentService: CommentsService) {}
  
    @Post()
    async create(@Body() createCommentDto: CreateCommentDto) {
      return this.commentService.create(createCommentDto);
    }
  
    @Get()
    async findAll(@Query() paginationQuery: PaginationQueryDto) {
      return this.commentService.findAll(paginationQuery);
    }
  
    @Get(':id')
    async findOne(@Param('id') id: string) {
      return this.commentService.findOne(id);
    }
  
    @Patch(':id')
    async update(
      @Param('id') id: string, 
      @Body() updateCommentDto: UpdateCommentDto
    ) {
      return this.commentService.update(id, updateCommentDto);
    }
  
    @Delete(':id')
    async remove(@Param('id') id: string) {
      return this.commentService.softDelete(id);
    }
  
    @Get('content/:contentType/:contentId')
    async findByContent(
      @Param('contentType') contentType: ContentType,
      @Param('contentId') contentId: string,
      @Query() paginationQuery: PaginationQueryDto
    ) {
      return this.commentService.findByContentId(
        contentType,
        contentId,
        paginationQuery
      );
    }
  
    @Get('replies/:parentId')
    async findReplies(
      @Param('parentId') parentId: string,
      @Query() paginationQuery: PaginationQueryDto
    ) {
      return this.commentService.findReplies(parentId, paginationQuery);
    }
  
    @Patch(':id/status')
    async updateStatus(
      @Param('id') id: string, 
      @Body('status') status: CommentStatus
    ) {
      const updateDto: UpdateCommentDto = { status };
      return this.commentService.update(id, updateDto);
    }
  
    @Patch(':id/flag')
    async flagComment(@Param('id') id: string) {
      return this.commentService.flagComment(id);
    }
  
    @Get('content/:contentType/:contentId/tree')
    async getCommentTree(
      @Param('contentType') contentType: ContentType,
      @Param('contentId') contentId: string,
      @Query('maxDepth') maxDepth: number = 2
    ) {
      return this.commentService.getCommentTree(contentType, contentId, maxDepth);
    }
  
    @Get('user/:userId')
    async findByUser(
      @Param('userId') userId: string,
      @Query() paginationQuery: PaginationQueryDto
    ) {
      return this.commentService.findByUserId(userId, paginationQuery);
    }
  }