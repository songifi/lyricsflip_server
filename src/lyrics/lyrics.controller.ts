import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateLyricsDto, UpdateLyricsDto } from '../dto/lyrics.dto';

@Controller('lyrics')
@ApiTags('lyrics')
@ApiBearerAuth()
export class LyricsController {
  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create new lyrics' })
  @ApiResponse({
    status: 201,
    description: 'The lyrics have been successfully created.',
    type: CreateLyricsDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() createLyricsDto: CreateLyricsDto) {
    return 'This action adds new lyrics';
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Get all lyrics' })
  @ApiResponse({
    status: 200,
    description: 'Return all lyrics.',
    type: [CreateLyricsDto],
  })
  @ApiQuery({
    name: 'genre',
    required: false,
    description: 'Filter by genre',
  })
  findAll(@Query('genre') genre?: string) {
    return 'This action returns all lyrics';
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get lyrics by id' })
  @ApiParam({
    name: 'id',
    description: 'The lyrics ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Return the lyrics.',
    type: CreateLyricsDto,
  })
  @ApiResponse({ status: 404, description: 'Lyrics not found.' })
  findOne(@Param('id') id: string) {
    return `This action returns lyrics #${id}`;
  }

  @Put(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update lyrics' })
  @ApiParam({
    name: 'id',
    description: 'The lyrics ID',
  })
  @ApiResponse({
    status: 200,
    description: 'The lyrics have been successfully updated.',
    type: UpdateLyricsDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 404, description: 'Lyrics not found.' })
  update(@Param('id') id: string, @Body() updateLyricsDto: UpdateLyricsDto) {
    return `This action updates lyrics #${id}`;
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete lyrics' })
  @ApiParam({
    name: 'id',
    description: 'The lyrics ID',
  })
  @ApiResponse({
    status: 200,
    description: 'The lyrics have been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Lyrics not found.' })
  remove(@Param('id') id: string) {
    return `This action removes lyrics #${id}`;
  }
}
