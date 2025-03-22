// File: src/modules/player/controllers/player.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Put,
    UseGuards,
    HttpStatus,
    Query,
    Patch
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
    ApiBody,
    ApiQuery
  } from '@nestjs/swagger';
  import { PlayerService } from '../services/player.service';
  import { CreatePlayerDto } from '../dto/create-player.dto';
  import { UpdatePlayerStatusDto } from '../dto/update-player-status.dto';
  import { SubmitAnswerDto } from '../dto/submit-answer.dto';
  import { PlayerResponseDto } from '../dto/player-response.dto';
  import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
  import { CurrentUser } from '../../auth/decorators/current-user.decorator';
  import { RolesGuard } from '../../auth/guards/roles.guard';
  import { Roles } from '../../auth/decorators/roles.decorator';
  
  @ApiTags('players')
  @Controller('players')
  export class PlayerController {
    constructor(private readonly playerService: PlayerService) {}
  
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Join a game session as a player' })
    @ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Player created successfully',
      type: PlayerResponseDto
    })
    @ApiBody({ type: CreatePlayerDto })
    async create(
      @CurrentUser() userId: string,
      @Body() createPlayerDto: CreatePlayerDto
    ) {
      const player = await this.playerService.create(userId, createPlayerDto);
      return this.mapToPlayerResponse(player);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get player by ID' })
    @ApiParam({ name: 'id', description: 'Player ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Player retrieved successfully',
      type: PlayerResponseDto
    })
    async findOne(@Param('id') id: string) {
      const player = await this.playerService.findById(id);
      return this.mapToPlayerResponse(player);
    }
  
    @Get('session/:sessionId')
    @ApiOperation({ summary: 'Get all players in a session' })
    @ApiParam({ name: 'sessionId', description: 'Game Session ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Players retrieved successfully',
      type: [PlayerResponseDto]
    })
    async findBySession(@Param('sessionId') sessionId: string) {
      const players = await this.playerService.findBySession(sessionId);
      return players.map(player => this.mapToPlayerResponse(player));
    }
  
    @Get('session/:sessionId/leaderboard')
    @ApiOperation({ summary: 'Get session leaderboard' })
    @ApiParam({ name: 'sessionId', description: 'Game Session ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Leaderboard retrieved successfully',
      type: [PlayerResponseDto]
    })
    async getLeaderboard(@Param('sessionId') sessionId: string) {
      const players = await this.playerService.getLeaderboard(sessionId);
      return players.map(player => this.mapToPlayerResponse(player));
    }
  
    @Get('user/:userId/history')
    @ApiOperation({ summary: 'Get player history' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Player history retrieved successfully',
      type: [PlayerResponseDto]
    })
    async getPlayerHistory(@Param('userId') userId: string) {
      const history = await this.playerService.getPlayerHistory(userId);
      return history.map(entry => this.mapToPlayerResponse(entry));
    }
  
    @Get('user/:userId/session/:sessionId')
    @ApiOperation({ summary: 'Get player by user ID and session ID' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'sessionId', description: 'Game Session ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Player retrieved successfully',
      type: PlayerResponseDto
    })
    async findByUserAndSession(
      @Param('userId') userId: string,
      @Param('sessionId') sessionId: string
    ) {
      const player = await this.playerService.findByUserAndSession(userId, sessionId);
      return this.mapToPlayerResponse(player);
    }
  
    @Put(':id/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update player status' })
    @ApiParam({ name: 'id', description: 'Player ID' })
    @ApiBody({ type: UpdatePlayerStatusDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Player status updated successfully',
      type: PlayerResponseDto
    })
    async updateStatus(
      @Param('id') id: string,
      @Body() updatePlayerStatusDto: UpdatePlayerStatusDto
    ) {
      const player = await this.playerService.updateStatus(id, updatePlayerStatusDto);
      return this.mapToPlayerResponse(player);
    }
  
    @Post(':id/answers')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Submit an answer for a player' })
    @ApiParam({ name: 'id', description: 'Player ID' })
    @ApiBody({ type: SubmitAnswerDto })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Answer submitted successfully',
      type: PlayerResponseDto
    })
    async submitAnswer(
      @Param('id') id: string,
      @Body() submitAnswerDto: SubmitAnswerDto
    ) {
      const player = await this.playerService.submitAnswer(id, submitAnswerDto);
      return this.mapToPlayerResponse(player);
    }
  
    @Patch(':id/metadata')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update player metadata' })
    @ApiParam({ name: 'id', description: 'Player ID' })
    @ApiBody({ 
      schema: {
        type: 'object',
        properties: {
          metadata: {
            type: 'object',
            example: { avatar: 'rocket', color: '#ff5500' }
          }
        }
      }
    })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Player metadata updated successfully',
      type: PlayerResponseDto
    })
    async updateMetadata(
      @Param('id') id: string,
      @Body('metadata') metadata: Record<string, any>
    ) {
      const player = await this.playerService.updateMetadata(id, metadata);
      return this.mapToPlayerResponse(player);
    }
  
    @Post('session/:sessionId/reset-scores')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'host')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reset all player scores in a session' })
    @ApiParam({ name: 'sessionId', description: 'Game Session ID' })
    @ApiResponse({
      status: HttpStatus.OK,
      description: 'Scores reset successfully'
    })
    async resetSessionScores(@Param('sessionId') sessionId: string) {
      await this.playerService.resetSessionScores(sessionId);
      return { message: 'Scores reset successfully' };
    }
  
    /**
     * Map player document to response DTO
     */
    private mapToPlayerResponse(player: any): PlayerResponseDto {
      const response: PlayerResponseDto = {
        id: player._id.toString(),
        userId: player.userId._id ? player.userId._id.toString() : player.userId.toString(),
        sessionId: player.sessionId._id ? player.sessionId._id.toString() : player.sessionId.toString(),
        status: player.status,
        joinedAt: player.joinedAt,
        score: player.score,
        position: player.position,
        activeTime: player.activeTime,
        lastActive: player.lastActive,
        answers: player.answers.map(answer => ({
          questionId: answer.questionId.toString(),
          value: answer.value,
          isCorrect: answer.isCorrect,
          timeToAnswer: answer.timeToAnswer,
          pointsEarned: answer.pointsEarned,
          submittedAt: answer.submittedAt
        })),
        correctAnswers: player.correctAnswers,
        metadata: player.metadata || {},
        createdAt: player.createdAt,
        updatedAt: player.updatedAt
      };
  
      // Add user information if available
      if (player.userId && typeof player.userId === 'object') {
        response.user = {
          id: player.userId._id.toString(),
          username: player.userId.username,
          name: player.userId.name,
          avatar: player.userId.avatar
        };
      }
  
      return response;
    }
  }
  