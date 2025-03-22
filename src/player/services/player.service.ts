// File: src/modules/player/services/player.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player, PlayerDocument, PlayerStatus } from '../schemas/player.schema';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerStatusDto } from '../dto/update-player-status.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    @InjectModel(Player.name) private playerModel: Model<PlayerDocument>,
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * Create a new player entry (join a game session)
   */
  async create(userId: string, createPlayerDto: CreatePlayerDto): Promise<PlayerDocument> {
    try {
      const { sessionId, status = PlayerStatus.JOINED, metadata = {} } = createPlayerDto;

      // Check if player already exists in this session
      const existingPlayer = await this.playerModel.findOne({
        userId: new Types.ObjectId(userId),
        sessionId: new Types.ObjectId(sessionId)
      }).exec();

      if (existingPlayer) {
        // If player left previously, we can update their status to rejoin
        if (existingPlayer.status === PlayerStatus.LEFT) {
          existingPlayer.status = status;
          existingPlayer.lastActive = new Date();
          await existingPlayer.save();
          
          // Emit player rejoined event
          this.eventEmitter.emit('player.rejoined', {
            playerId: existingPlayer._id,
            sessionId,
            userId
          });
          
          return existingPlayer;
        }
        
        throw new ConflictException('Player already exists in this session');
      }

      // Create a new player
      const newPlayer = new this.playerModel({
        userId: new Types.ObjectId(userId),
        sessionId: new Types.ObjectId(sessionId),
        status,
        joinedAt: new Date(),
        lastActive: new Date(),
        metadata
      });

      const savedPlayer = await newPlayer.save();

      // Emit player joined event
      this.eventEmitter.emit('player.joined', {
        playerId: savedPlayer._id,
        sessionId,
        userId
      });

      return savedPlayer;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to create player: ${error.message}`, error.stack);
      if (error.code === 11000) { // Duplicate key error
        throw new ConflictException('Player already exists in this session');
      }
      throw new BadRequestException('Failed to create player');
    }
  }

  /**
   * Get player by ID
   */
  async findById(id: string): Promise<PlayerDocument> {
    const player = await this.playerModel.findById(id)
      .populate('userId', 'username name avatar')
      .exec();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  /**
   * Get player by user ID and session ID
   */
  async findByUserAndSession(userId: string, sessionId: string): Promise<PlayerDocument> {
    const player = await this.playerModel.findOne({
      userId: new Types.ObjectId(userId),
      sessionId: new Types.ObjectId(sessionId)
    })
      .populate('userId', 'username name avatar')
      .exec();

    if (!player) {
      throw new NotFoundException('Player not found in this session');
    }

    return player;
  }

  /**
   * Get all players in a session
   */
  async findBySession(sessionId: string): Promise<PlayerDocument[]> {
    return this.playerModel.find({
      sessionId: new Types.ObjectId(sessionId),
      status: { $ne: PlayerStatus.LEFT } // Exclude players who left
    })
      .populate('userId', 'username name avatar')
      .sort({ score: -1 }) // Sort by score descending
      .exec();
  }

  /**
   * Get session leaderboard
   */
  async getLeaderboard(sessionId: string): Promise<PlayerDocument[]> {
    const players = await this.playerModel.find({
      sessionId: new Types.ObjectId(sessionId)
    })
      .sort({ score: -1 })
      .populate('userId', 'username name avatar')
      .exec();

    // Update player positions based on score ranking
    players.forEach((player, index) => {
      player.position = index + 1;
    });

    return players;
  }

  /**
   * Update player status
   */
  async updateStatus(
    playerId: string,
    updatePlayerStatusDto: UpdatePlayerStatusDto
  ): Promise<PlayerDocument> {
    const player = await this.playerModel.findById(playerId).exec();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Update player status
    player.status = updatePlayerStatusDto.status;
    player.lastActive = new Date();

    // If player is leaving, calculate total active time
    if (updatePlayerStatusDto.status === PlayerStatus.LEFT) {
      const now = new Date();
      const activeSeconds = (now.getTime() - player.joinedAt.getTime()) / 1000;
      player.activeTime += activeSeconds;
    }

    const updatedPlayer = await player.save();

    // Emit status change event
    this.eventEmitter.emit('player.status.updated', {
      playerId,
      sessionId: player.sessionId,
      userId: player.userId,
      status: updatePlayerStatusDto.status
    });

    return updatedPlayer;
  }

  /**
   * Submit an answer for a player
   */
  async submitAnswer(
    playerId: string,
    submitAnswerDto: SubmitAnswerDto
  ): Promise<PlayerDocument> {
    const player = await this.playerModel.findById(playerId).exec();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Check if player is active
    if (player.status !== PlayerStatus.ACTIVE) {
      throw new BadRequestException('Only active players can submit answers');
    }

    const { questionId, value, isCorrect, timeToAnswer, pointsEarned = 0 } = submitAnswerDto;

    // Create new answer
    const answer = {
      questionId: new Types.ObjectId(questionId),
      value,
      isCorrect,
      timeToAnswer,
      pointsEarned,
      submittedAt: new Date()
    };

    // Add answer to the player's answers array
    player.answers.push(answer);

    // Update player stats
    player.score += pointsEarned;
    if (isCorrect) {
      player.correctAnswers += 1;
    }
    player.lastActive = new Date();

    const updatedPlayer = await player.save();

    // Emit answer submitted event
    this.eventEmitter.emit('player.answer.submitted', {
      playerId,
      sessionId: player.sessionId,
      userId: player.userId,
      questionId,
      isCorrect,
      pointsEarned
    });

    return updatedPlayer;
  }

  /**
   * Get player history (sessions played)
   */
  async getPlayerHistory(userId: string): Promise<PlayerDocument[]> {
    return this.playerModel.find({
      userId: new Types.ObjectId(userId)
    })
      .sort({ joinedAt: -1 })
      .populate('sessionId', 'title gameType startedAt endedAt')
      .exec();
  }

  /**
   * Update player metadata
   */
  async updateMetadata(
    playerId: string,
    metadata: Record<string, any>
  ): Promise<PlayerDocument> {
    const player = await this.playerModel.findById(playerId).exec();

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Merge new metadata with existing metadata
    player.metadata = { ...player.metadata, ...metadata };
    player.lastActive = new Date();

    return player.save();
  }

  /**
   * Reset player scores in a session
   */
  async resetSessionScores(sessionId: string): Promise<void> {
    await this.playerModel.updateMany(
      { sessionId: new Types.ObjectId(sessionId) },
      { 
        $set: { 
          score: 0,
          correctAnswers: 0,
          answers: [],
          position: 0
        }
      }
    ).exec();

    // Emit scores reset event
    this.eventEmitter.emit('session.scores.reset', { sessionId });
  }
}