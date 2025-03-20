// src/modules/round-answer/round-answer.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RoundAnswer } from './schemas/round-answer.schema';
import { GameRound } from '../game-round/schemas/game-round.schema';
import { Player } from '../player/schemas/player.schema';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { UpdateAnswerScoreDto } from './dto/update-answer-score.dto';
import { GetAnswersQueryDto } from './dto/get-answers-query.dto';

@Injectable()
export class RoundAnswerService {
  constructor(
    @InjectModel(RoundAnswer.name) private roundAnswerModel: Model<RoundAnswer>,
    @InjectModel(GameRound.name) private gameRoundModel: Model<GameRound>,
    @InjectModel(Player.name) private playerModel: Model<Player>,
  ) {}

  /**
   * Submit an answer for a round
   */
  async submitAnswer(playerId: string, submitAnswerDto: SubmitAnswerDto): Promise<RoundAnswer> {
    const { roundId, answer, metadata } = submitAnswerDto;

    // Verify the round exists
    const round = await this.gameRoundModel.findById(roundId);
    if (!round) {
      throw new NotFoundException('Game round not found');
    }

    // Verify the player exists
    const player = await this.playerModel.findById(playerId);
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Verify player is part of the game session
    if (player.sessionId.toString() !== round.sessionId.toString()) {
      throw new BadRequestException('Player is not part of this game session');
    }

    // Check if the round is active
    if (round.status !== 'active') {
      throw new BadRequestException('Cannot submit answer for inactive round');
    }

    // Check if player already answered
    const existingAnswer = await this.roundAnswerModel.findOne({
      roundId,
      playerId,
    });

    if (existingAnswer) {
      throw new ConflictException('Player has already submitted an answer for this round');
    }

    // Calculate response time
    const now = new Date();
    const responseTimeMs = now.getTime() - round.startTime.getTime();

    // Create answer with initial score (will be updated later)
    const roundAnswer = new this.roundAnswerModel({
      roundId,
      playerId,
      answer,
      submittedAt: now,
      score: 0,
      isCorrect: false,
      responseTimeMs,
      metadata: metadata || {},
    });

    return roundAnswer.save();
  }

  /**
   * Update the score for an answer
   */
  async updateAnswerScore(
    answerId: string,
    updateAnswerScoreDto: UpdateAnswerScoreDto,
  ): Promise<RoundAnswer> {
    const { score, isCorrect } = updateAnswerScoreDto;

    const answer = await this.roundAnswerModel.findById(answerId);
    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    // Update score and correctness
    answer.score = score;
    answer.isCorrect = isCorrect;

    return answer.save();
  }

  /**
   * Get answers for a specific round
   */
  async getRoundAnswers(
    roundId: string,
    query: GetAnswersQueryDto = {},
  ): Promise<RoundAnswer[]> {
    const filter: any = { roundId };

    // Apply optional filters
    if (query.correctOnly) {
      filter.isCorrect = true;
    }

    if (query.playerId) {
      filter.playerId = query.playerId;
    }

    return this.roundAnswerModel
      .find(filter)
      .populate('playerId', 'userId status isSpectator score')
      .sort({ submittedAt: 1 })
      .exec();
  }

  /**
   * Get a specific answer by ID
   */
  async getAnswerById(answerId: string): Promise<RoundAnswer> {
    const answer = await this.roundAnswerModel
      .findById(answerId)
      .populate('playerId', 'userId status isSpectator score')
      .populate('roundId', 'sessionId songId startTime endTime status');

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return answer;
  }

  /**
   * Get answers by player ID
   */
  async getPlayerAnswers(playerId: string): Promise<RoundAnswer[]> {
    return this.roundAnswerModel
      .find({ playerId })
      .populate('roundId', 'sessionId songId startTime endTime status')
      .sort({ submittedAt: -1 })
      .exec();
  }

  /**
   * Get total correct answers for a player in a session
   */
  async getPlayerCorrectAnswersCount(playerId: string, sessionId: string): Promise<number> {
    // Get rounds for this session
    const rounds = await this.gameRoundModel.find({ sessionId }).select('_id');
    const roundIds = rounds.map(round => round._id);

    // Count correct answers
    return this.roundAnswerModel.countDocuments({
      playerId,
      roundId: { $in: roundIds },
      isCorrect: true,
    });
  }

  /**
   * Get player's total score in a session
   */
  async getPlayerTotalScore(playerId: string, sessionId: string): Promise<number> {
    // Get rounds for this session
    const rounds = await this.gameRoundModel.find({ sessionId }).select('_id');
    const roundIds = rounds.map(round => round._id);

    // Aggregate scores
    const result = await this.roundAnswerModel.aggregate([
      {
        $match: {
          playerId: new Types.ObjectId(playerId),
          roundId: { $in: roundIds },
        },
      },
      {
        $group: {
          _id: null,
          totalScore: { $sum: '$score' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalScore : 0;
  }

  /**
   * Delete all answers for a round (for admin use)
   */
  async deleteRoundAnswers(roundId: string): Promise<number> {
    const result = await this.roundAnswerModel.deleteMany({ roundId });
    return result.deletedCount;
  }
}
