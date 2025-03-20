// src/modules/round-answer/round-answer.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoundAnswerService } from './round-answer.service';
import { PlayerService } from '../player/player.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { UpdateAnswerScoreDto } from './dto/update-answer-score.dto';
import { GetAnswersQueryDto } from './dto/get-answers-query.dto';
import { AnswerResponseDto } from './dto/answer-response.dto';

@ApiTags('round-answers')
@Controller('round-answers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoundAnswerController {
  constructor(
    private readonly roundAnswerService: RoundAnswerService,
    private readonly playerService: PlayerService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit an answer for a round' })
  @ApiBody({ type: SubmitAnswerDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Answer submitted successfully',
    type: AnswerResponseDto,
  })
  async submitAnswer(
    @CurrentUser('sub') userId: string,
    @Body() submitAnswerDto: SubmitAnswerDto,
  ) {
    // Get player ID from user ID and game session
    const gameRound = await this.playerService.getPlayerByUserId(
      userId,
      submitAnswerDto.roundId
    );

    const answer = await this.roundAnswerService.submitAnswer(
      gameRound.player._id,
      submitAnswerDto,
    );

    return this.mapAnswerToResponse(answer);
  }

  @Get('round/:roundId')
  @ApiOperation({ summary: 'Get answers for a specific round' })
  @ApiParam({ name: 'roundId', description: 'ID of the game round' })
  @ApiQuery({ type: GetAnswersQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Round answers retrieved successfully',
    type: [AnswerResponseDto],
  })
  async getRoundAnswers(
    @Param('roundId') roundId: string,
    @Query() query: GetAnswersQueryDto,
  ) {
    const answers = await this.roundAnswerService.getRoundAnswers(roundId, query);
    return answers.map(answer => this.mapAnswerToResponse(answer));
  }

  @Get(':answerId')
  @ApiOperation({ summary: 'Get a specific answer by ID' })
  @ApiParam({ name: 'answerId', description: 'ID of the answer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Answer retrieved successfully',
    type: AnswerResponseDto,
  })
  async getAnswer(@Param('answerId') answerId: string) {
    const answer = await this.roundAnswerService.getAnswerById(answerId);
    return this.mapAnswerToResponse(answer);
  }

  @Get('player/:playerId')
  @ApiOperation({ summary: 'Get answers by player ID' })
  @ApiParam({ name: 'playerId', description: 'ID of the player' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Player answers retrieved successfully',
    type: [AnswerResponseDto],
  })
  async getPlayerAnswers(@Param('playerId') playerId: string) {
    const answers = await this.roundAnswerService.getPlayerAnswers(playerId);
    return answers.map(answer => this.mapAnswerToResponse(answer));
  }

  @Patch(':answerId/score')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Update the score for an answer (admin only)' })
  @ApiParam({ name: 'answerId', description: 'ID of the answer' })
  @ApiBody({ type: UpdateAnswerScoreDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Answer score updated successfully',
    type: AnswerResponseDto,
  })
  async updateAnswerScore(
    @Param('answerId') answerId: string,
    @Body() updateAnswerScoreDto: UpdateAnswerScoreDto,
  ) {
    const answer = await this.roundAnswerService.updateAnswerScore(
      answerId,
      updateAnswerScoreDto,
    );
    return this.mapAnswerToResponse(answer);
  }

  @Delete('round/:roundId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete all answers for a round (admin only)' })
  @ApiParam({ name: 'roundId', description: 'ID of the game round' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Round answers deleted successfully',
  })
  async deleteRoundAnswers(@Param('roundId') roundId: string) {
    const deletedCount = await this.roundAnswerService.deleteRoundAnswers(roundId);
    return {
      message: `Deleted ${deletedCount} answers for round ${roundId}`,
    };
  }

  /**
   * Map the RoundAnswer entity to a sanitized response DTO
   */
  private mapAnswerToResponse(answer: any): AnswerResponseDto {
    const response: any = {
      id: answer._id?.toString(),
      roundId: answer.roundId?._id?.toString() || answer.roundId?.toString(),
      answer: answer.answer,
      submittedAt: answer.submittedAt,
      score: answer.score,
      isCorrect: answer.isCorrect,
      responseTimeMs: answer.responseTimeMs,
      metadata: answer.metadata,
    };

    // Add player information if populated
    if (answer.playerId) {
      const player = answer.playerId;
      response.player = {
        id: player._id?.toString(),
        username: player.username || player.userId?.username || 'Unknown',
      };
    }

    return response;
  }
}
