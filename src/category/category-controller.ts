import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, CategoryFilterDto, AddSongToCategoryDto, CategoryStatsDto } from './category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../user/user.entity';
import { Category } from './category.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Song } from '../song/song.entity';

@ApiTags('categories')
@Controller('categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'The category has been successfully created.', type: Category })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 409, description: 'Category with this name already exists.' })
  create(@Body() createCategoryDto: CreateCategoryDto, @CurrentUser() user: User): Promise<Category> {
    return this.categoryService.create(createCategoryDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with optional filtering' })
  @ApiResponse({ status: 200, description: 'Return all categories.', type: [Category] })
  findAll(@Query() filterDto: CategoryFilterDto): Promise<Category[]> {
    return this.categoryService.findAll(filterDto);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular categories' })
  @ApiQuery({ name: 'type', enum: ['genre', 'decade', 'custom'], required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Return popular categories.', type: [Category] })
  getPopularCategories(
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ): Promise<Category[]> {
    return this.categoryService.getPopularCategories(type as any, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({ status: 200, description: 'Return the category.', type: Category })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Category> {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({ status: 200, description: 'The category has been successfully updated.', type: Category })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: User,
  ): Promise<Category> {
    return this.categoryService.update(id, updateCategoryDto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({ status: 204, description: 'The category has been successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User): Promise<void> {
    return this.categoryService.remove(id, user);
  }

  @Post(':id/songs')
  @ApiOperation({ summary: 'Add a song to a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({ status: 200, description: 'The song has been added to the category.', type: Category })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category or song not found.' })
  @ApiResponse({ status: 409, description: 'Song is already in the category.' })
  addSongToCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addSongDto: AddSongToCategoryDto,
    @CurrentUser() user: User,
  ): Promise<Category> {
    return this.categoryService.addSongToCategory(id, addSongDto.songId, user);
  }

  @Delete(':id/songs/:songId')
  @ApiOperation({ summary: 'Remove a song from a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiParam({ name: 'songId', description: 'Song id' })
  @ApiResponse({ status: 200, description: 'The song has been removed from the category.', type: Category })
  @ApiResponse({ status: 400, description: 'Song is not in the category.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  removeSongFromCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('songId', ParseUUIDPipe) songId: string,
    @CurrentUser() user: User,
  ): Promise<Category> {
    return this.categoryService.removeSongFromCategory(id, songId, user);
  }

  @Get(':id/songs')
  @ApiOperation({ summary: 'Get songs in a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Return songs in the category.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  getSongsInCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ songs: Song[], total: number }> {
    return this.categoryService.getSongsInCategory(id, page, limit);
  }

  @Post(':id/tags/:tag')
  @ApiOperation({ summary: 'Add a tag to a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiParam({ name: 'tag', description: 'Tag to add' })
  @ApiResponse({ status: 200, description: 'The tag has been added to the category.', type: Category })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  addTagToCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tag') tag: string,
    @CurrentUser() user: User,
  ): Promise<Category> {
    return this.categoryService.addTagToCategory(id, tag, user);
  }

  @Delete(':id/tags/:tag')
  @ApiOperation({ summary: 'Remove a tag from a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiParam({ name: 'tag', description: 'Tag to remove' })
  @ApiResponse({ status: 200, description: 'The tag has been removed from the category.', type: Category })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  removeTagFromCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tag') tag: string,
    @CurrentUser() user: User,
  ): Promise<Category> {
    return this.categoryService.removeTagFromCategory(id, tag, user);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get statistics for a category' })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({ status: 200, description: 'Return statistics for the category.', type: CategoryStatsDto })
  @ApiResponse({ status: 404, description: 'Category not found.' })
  async getCategoryStatistics(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryStatsDto> {
    const category = await this.categoryService.findOne(id);
    const stats = category.statistics?.[0];
    
    return {
      songCount: stats?.songCount || 0,
      totalListens: stats?.totalListens || 0,
      totalLikes: stats?.totalLikes || 0,
    };
  }
}