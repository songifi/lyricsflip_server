import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import { GameRound, GameRoundDocument, GameRoundStatus } from './game-round.schema';
import { 
  CreateGameRoundDto, 
  UpdateGameRoundDto, 
  GameRoundQueryDto,
  StartRoundDto,
  EndRoundDto
} from './game-round.dto';

@Injectable()
export class GameRoundService {
  private readonly logger = new Logger(GameRoundService.name);

  constructor(
    @InjectModel(GameRound.name) private gameRoundModel: Model<GameRoundDocument>
  ) {}

  /**
   * Create a new game round
   */
  async create(createGameRoundDto: CreateGameRoundDto): Promise<GameRound> {
    try {
      const roundId = createGameRoundDto.roundId || uuidv4();
      
      // Convert string IDs to MongoDB ObjectIds
      const sessionId = new Types.ObjectId(createGameRoundDto.sessionId);
      const songId = new Types.ObjectId(createGameRoundDto.songId);
      
      // Determine round number if not provided
      let roundNumber = createGameRoundDto.roundNumber;
      if (!roundNumber) {
        // Get highest round number for this session and increment
        const highestRound = await this.gameRoundModel.findOne(
          { sessionId },
          { roundNumber: 1 },
          { sort: { roundNumber: -1 } }
        );
        
        roundNumber = highestRound ? highestRound.roundNumber + 1 : 1;
      }
      
      const newRound = new this.gameRoundModel({
        roundId,
        sessionId,
        songId,
        roundNumber,
        status: GameRoundStatus.PENDING,
        durationSeconds: createGameRoundDto.durationSeconds || 60,
        roundConfig: createGameRoundDto.roundConfig || {},
        metadata: createGameRoundDto.metadata || {}
      });
      
      return newRound.save();
    } catch (error) {
      this.logger.error(`Error creating game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all game rounds matching query
   */
  async findAll(queryDto: GameRoundQueryDto): Promise<{ rounds: GameRound[]; total: number }> {
    try {
      const { 
        sessionId, 
        status, 
        roundNumber, 
        songId,
        skip = 0, 
        limit = 25,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = queryDto;
      
      // Build filter
      const filter: any = {};
      
      if (sessionId) {
        filter.sessionId = new Types.ObjectId(sessionId);
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (roundNumber !== undefined) {
        filter.roundNumber = roundNumber;
      }
      
      if (songId) {
        filter.songId = new Types.ObjectId(songId);
      }
      
      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      
      // Execute query with pagination
      const [rounds, total] = await Promise.all([
        this.gameRoundModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('songId', 'title artist duration imageUrl')
          .exec(),
        this.gameRoundModel.countDocuments(filter)
      ]);
      
      return { rounds, total };
    } catch (error) {
      this.logger.error(`Error finding game rounds: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find one game round by ID
   */
  async findOne(roundId: string): Promise<GameRound> {
    try {
      const round = await this.gameRoundModel
        .findOne({ roundId })
        .populate('songId', 'title artist duration imageUrl')
        .exec();
      
      if (!round) {
        throw new NotFoundException(`Game round with ID ${roundId} not found`);
      }
      
      return round;
    } catch (error) {
      this.logger.error(`Error finding game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a game round
   */
  async update(roundId: string, updateGameRoundDto: UpdateGameRoundDto): Promise<GameRound> {
    try {
      // Prepare update object
      const updateData: any = { ...updateGameRoundDto };
      
      // Convert string IDs to MongoDB ObjectIds
      if (updateData.songId) {
        updateData.songId = new Types.ObjectId(updateData.songId);
      }
      
      // Update timestamps
      updateData.updatedAt = new Date();
      
      const round = await this.gameRoundModel
        .findOneAndUpdate(
          { roundId },
          { $set: updateData },
          { new: true }
        )
        .populate('songId', 'title artist duration imageUrl')
        .exec();
      
      if (!round) {
        throw new NotFoundException(`Game round with ID ${roundId} not found`);
      }
      
      return round;
    } catch (error) {
      this.logger.error(`Error updating game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a game round
   */
  async remove(roundId: string): Promise<void> {
    try {
      const result = await this.gameRoundModel.deleteOne({ roundId }).exec();
      
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Game round with ID ${roundId} not found`);
      }
    } catch (error) {
      this.logger.error(`Error removing game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Start a game round
   */
  async startRound(roundId: string, startRoundDto?: StartRoundDto): Promise<GameRound> {
    try {
      const round = await this.gameRoundModel.findOne({ roundId });
      
      if (!round) {
        throw new NotFoundException(`Game round with ID ${roundId} not found`);
      }
      
      // Validate current status
      if (round.status !== GameRoundStatus.PENDING) {
        throw new BadRequestException(`Cannot start round with status ${round.status}`);
      }
      
      // Update round
      round.status = GameRoundStatus.ACTIVE;
      round.startTime = startRoundDto?.startTime || new Date();
      round.updatedAt = new Date();
      
      return round.save();
    } catch (error) {
      this.logger.error(`Error starting game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * End a game round
   */
  async endRound(roundId: string, endRoundDto?: EndRoundDto): Promise<GameRound> {
    try {
      const round = await this.gameRoundModel.findOne({ roundId });
      
      if (!round) {
        throw new NotFoundException(`Game round with ID ${roundId} not found`);
      }
      
      // Validate current status
      if (round.status !== GameRoundStatus.ACTIVE) {
        throw new BadRequestException(`Cannot end round with status ${round.status}`);
      }
      
      // Update round
      round.status = GameRoundStatus.COMPLETED;
      round.endTime = endRoundDto?.endTime || new Date();
      round.updatedAt = new Date();
      
      // Update statistics if provided
      if (endRoundDto?.participantCount !== undefined) {
        round.participantCount = endRoundDto.participantCount;
      }
      
      if (endRoundDto?.correctAnswerCount !== undefined) {
        round.correctAnswerCount = endRoundDto.correctAnswerCount;
      }
      
      // Update metadata with results if provided
      if (endRoundDto?.results) {
        round.metadata = {
          ...round.metadata,
          results: endRoundDto.results
        };
      }
      
      return round.save();
    } catch (error) {
      this.logger.error(`Error ending game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel a game round
   */
  async cancelRound(roundId: string): Promise<GameRound> {
    try {
      const round = await this.gameRoundModel.findOne({ roundId });
      
      if (!round) {
        throw new NotFoundException(`Game round with ID ${roundId} not found`);
      }
      
      // Only allow cancelling pending or active rounds
      if (![GameRoundStatus.PENDING, GameRoundStatus.ACTIVE].includes(round.status)) {
        throw new BadRequestException(`Cannot cancel round with status ${round.status}`);
      }
      
      // Update round
      round.status = GameRoundStatus.CANCELLED;
      round.updatedAt = new Date();
      
      return round.save();
    } catch (error) {
      this.logger.error(`Error cancelling game round: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get active rounds for a session
   */
  async getActiveSessionRounds(sessionId: string): Promise<GameRound[]> {
    try {
      return this.gameRoundModel
        .find({
          sessionId: new Types.ObjectId(sessionId),
          status: GameRoundStatus.ACTIVE
        })
        .populate('songId', 'title artist duration imageUrl')
        .sort({ startTime: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error getting active rounds: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all rounds for a session
   */
  async getSessionRounds(sessionId: string): Promise<GameRound[]> {
    try {
      return this.gameRoundModel
        .find({
          sessionId: new Types.ObjectId(sessionId)
        })
        .populate('songId', 'title artist duration imageUrl')
        .sort({ roundNumber: 1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error getting session rounds: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get rounds by song ID
   */
  async getRoundsBySong(songId: string): Promise<GameRound[]> {
    try {
      return this.gameRoundModel
        .find({
          songId: new Types.ObjectId(songId)
        })
        .populate('sessionId', 'name')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error getting rounds by song: ${error.message}`, error.stack);
      throw error;
    }
  }
}
