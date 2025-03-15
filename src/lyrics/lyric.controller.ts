import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import type { lyricService } from './lyric.service';
import {
  CreatelyricDto,
  LyricExtractionOptionsDto,
  QuerylyricDto,
  UpdatelyricDto,
} from 'src/dto/lyric.dto';
import { LyricsManagementService } from './lyric-management.service';
import { lyricDocument } from 'src/schemas/lyric.schema';


@ApiTags('lyrics')
@Controller('lyrics')
export class lyricController {
  constructor(
    private readonly lyricService: lyricService,

    private readonly lyricManagementService: LyricsManagementService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new lyric' })
  @ApiBody({ type: CreatelyricDto, description: 'lyric data to create' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The lyric has been successfully created.',
    type: CreatelyricDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data.',
  })
  create(@Body() createlyricDto: CreatelyricDto) {
    return this.lyricService.create(createlyricDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all lyrics' })
  @ApiQuery({
    name: 'queryDto',
    type: QuerylyricDto,
    required: false,
    description: 'Query parameters for filtering, pagination, and sorting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of lyrics retrieved successfully',
    type: [CreatelyricDto],
  })
  findAll(@Query() queryDto: QuerylyricDto) {
    return this.lyricService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lyric by ID' })
  @ApiParam({ name: 'id', description: 'lyric ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The lyric has been found',
    type: CreatelyricDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'lyric not found' })
  findOne(@Param('id') id: string) {
    return this.lyricService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lyric' })
  @ApiParam({ name: 'id', description: 'lyric ID' })
  @ApiBody({ type: UpdatelyricDto, description: 'Updated lyric data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The lyric has been successfully updated',
    type: CreatelyricDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'lyric not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  update(@Param('id') id: string, @Body() updatelyricDto: UpdatelyricDto) {
    return this.lyricService.update(id, updatelyricDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lyric' })
  @ApiParam({ name: 'id', description: 'lyric ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The lyric has been successfully deleted',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'lyric not found' })
  remove(@Param('id') id: string) {
    return this.lyricService.delete(id);
  }
  
  //  Partial lyrics extraction for game rounds
  @Post(':id/extract')
  @ApiOperation({ summary: 'Extract partial lyrics for game rounds' })
  @ApiParam({ name: 'id', description: 'Lyric ID' })
  @ApiBody({
    type: LyricExtractionOptionsDto,
    description: 'Options for extracting partial lyrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Partial lyrics extracted successfully',
  })
  public async extractPartialLyrics(
    @Param('id') id: string,
    @Body() options: LyricExtractionOptionsDto,
  ): Promise<string> {
    const result = this.lyricManagementService.extractPartialLyrics(
      id,
      options,
    );
    return result[0];
  }

  // Batch processing for multiple lyrics
  @Post('batch')
  @ApiOperation({ summary: 'Process a batch of lyrics' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch processing completed successfully',
  })
 public async processBatch(@Body('ids') ids: string[]): Promise<lyricDocument[]> {
    const lyrics = await this.fetchLyricsByIds(ids);
    return this.lyricManagementService.processBatchLyrics(lyrics);
  }

  // Extracted method for fetching IDs (for better readability)
  private async fetchLyricsByIds(ids: string[]): Promise<lyricDocument[]> {
    return (await this.lyricService.findByIds(ids)) as lyricDocument[];
  }

}
