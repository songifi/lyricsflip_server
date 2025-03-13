import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpStatus, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from "@nestjs/swagger";
import type { SongService } from "./song.service";
import { CreateSongDto, QuerySongDto, UpdateSongDto } from "src/dto/song.dto";

@ApiTags('songs')
@Controller("songs")
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new song' })
  @ApiBody({ type: CreateSongDto, description: 'Song data to create' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'The song has been successfully created.',
    type: CreateSongDto 
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data.' })
  create(@Body() createSongDto: CreateSongDto) {
    return this.songService.create(createSongDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all songs' })
  @ApiQuery({ 
    name: 'queryDto', 
    type: QuerySongDto, 
    required: false,
    description: 'Query parameters for filtering, pagination, and sorting' 
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of songs retrieved successfully',
    type: [CreateSongDto]
  })
  findAll(@Query() queryDto: QuerySongDto) {
    return this.songService.findAll(queryDto);
  }

  @Get(":id")
  @ApiOperation({ summary: 'Get a song by ID' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The song has been found',
    type: CreateSongDto
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Song not found' })
  findOne(@Param("id") id: string) {
    return this.songService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: 'Update a song' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiBody({ type: UpdateSongDto, description: 'Updated song data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The song has been successfully updated',
    type: CreateSongDto
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Song not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input data' })
  update(@Param("id") id: string, @Body() updateSongDto: UpdateSongDto) {
    return this.songService.update(id, updateSongDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a song' })
  @ApiParam({ name: 'id', description: 'Song ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'The song has been successfully deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Song not found' })
  remove(@Param("id") id: string) {
    return this.songService.delete(id);
  }
}