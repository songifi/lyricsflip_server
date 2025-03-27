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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { GameRoundService } from './game-round.service';
import { GameRound } from './game-round.schema';
import {
  CreateGameRoundDto,
  UpdateGameRoundDto,
  GameRoundQueryDto,
  StartRoundDto,
  EndRoundDto,
} from './game-round.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('game-rounds')
@Controller('game-rounds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GameRoundController {
  constructor(private readonly gameRoundService: GameRoundService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Create a new game round' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The game round has been successfully created.',
    type: GameRound,
  })
  async create(@Body() createGameRoundDto: CreateGameRoundDto): Promise<GameRound> {
    return this.gameRoundService.create(createGameRoundDto);
  }

  @Get()
  @ApiOperation({ summary: 'Find all game rounds' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all game rounds matching the query.',
    type: [GameRound],
  })
  async findAll(@Query() query: GameRoundQueryDto) {
    return this.gameRoundService.findAll(query);
  }

  @Get(':roundId')
  @ApiOperation({ summary: 'Find one game round' })
  @ApiParam({ name: 'roundId', description: 'Round ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return the game round with the given ID.',
    type: GameRound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Game round not found.',
  })
  async findOne(@Param('roundId') roundId: string): Promise<GameRound> {
    return this.gameRoundService.findOne(roundId);
  }

  @Patch(':roundId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Update a game round' })
  @ApiParam({ name: 'roundId', description: 'Round ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The game round has been successfully updated.',
    type: GameRound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Game round not found.',
  })
  async update(
    @Param('roundId') roundId: string,
    @Body() updateGameRoundDto: UpdateGameRoundDto,
  ): Promise<GameRound> {
    return this.gameRoundService.update(roundId, updateGameRoundDto);
  }

  @Delete(':roundId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a game round' })
  @ApiParam({ name: 'roundId', description: 'Round ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The game round has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Game round not found.',
  })
  async remove(@Param('roundId') roundId: string): Promise<void> {
    return this.gameRoundService.remove(roundId);
  }

  @Post(':roundId/start')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Start a game round' })
  @ApiParam({ name: 'roundId', description: 'Round ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The game round has been successfully started.',
    type: GameRound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Game round not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot start round with current status.',
  })
  async startRound(
    @Param('roundId') roundId: string,
    @Body() startRoundDto?: StartRoundDto,
  ): Promise<GameRound> {
    return this.gameRoundService.startRound(roundId, startRoundDto);
  }

  @Post(':roundId/end')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'End a game round' })
  @ApiParam({ name: 'roundId', description: 'Round ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The game round has been successfully ended.',
    type: GameRound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Game round not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot end round with current status.',
  })
  async endRound(
    @Param('roundId') roundId: string,
    @Body() endRoundDto?: EndRoundDto,
  ): Promise<GameRound> {
    return this.gameRoundService.endRound(roundId, endRoundDto);
  }

  @Post(':roundId/cancel')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Cancel a game round' })
  @ApiParam({ name: 'roundId', description: 'Round ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The game round has been successfully cancelled.',
    type: GameRound,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Game round not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel round with current status.',
  })
  async cancelRound(@Param('roundId') roundId: string): Promise<GameRound> {
    return this.gameRoundService.cancelRound(roundId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get all rounds for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all rounds for the given session.',
    type: [GameRound],
  })
  async getSessionRounds(@Param('sessionId') sessionId: string): Promise<GameRound[]> {
    return this.gameRoundService.getSessionRounds(sessionId);
  }

  @Get('session/:sessionId/active')
  @ApiOperation({ summary: 'Get active rounds for a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all active rounds for the given session.',
    type: [GameRound],
  })
  async getActiveSessionRounds(@Param('sessionId') sessionId: string): Promise<GameRound[]> {
    return this.gameRoundService.getActiveSessionRounds(sessionId);
  }

  @Get('song/:songId')
  @ApiOperation({ summary: 'Get rounds by song' })
  @ApiParam({ name: 'songId', description: 'Song ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Return all rounds for the given song.',
    type: [GameRound],
  })
  async getRoundsBySong(@Param('songId') songId: string): Promise<GameRound[]> {
    return this.gameRoundService.getRoundsBySong(songId);
  }
}
