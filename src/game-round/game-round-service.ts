import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

import { GameRoundRepository } from './game-round.repository';
import { GameRound, GameRoundStatus } from './game-round.entity';
import { 
  CreateGameRoundDto, 
  UpdateGameRoundDto, 
  GameRoundFilterDto, 
  ChangeGameRoundStatusDto 
} from './game-round.dto';
import { 
  GameRoundCreatedEvent,
  GameRoundUpdatedEvent,
  GameRoundStatusChangedEvent,
  GameRoundStartedEvent,
  GameRoundCompletedEvent,
  GameRoundDeletedEvent,
  ParticipantJoinedGameRoundEvent,
  ParticipantLeftGameRoundEvent
} from './game-round.events';

import { SongService } from '../song/song.service';
import { LyricSelectionService } from '../lyric-selection/lyric-selection.service';
import { User } from '../user/user.entity';

@Injectable()
export class GameRoundService {
  private readonly logger = new Logger(GameRoundService.name);

  constructor(
    @InjectRepository(GameRoundRepository)
    private gameRoundRepository: GameRoundRepository,
    private songService: SongService,
    private lyricSelectionService: LyricSelectionService,
    private connection: Connection,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new game round
   */
  async create(createGameRoundDto: CreateGameRoundDto, creator: User): Promise<GameRound> {
    const { songId, ...roundData } = createGameRoundDto;
    
    // Verify the song exists
    await this.songService.findOne(songId);
    
    // Create new game round
    const gameRound = this.gameRoundRepository.create({
      ...roundData,
      songId,
      creator,
      creatorId: creator.id,
      status: GameRoundStatus.PENDING,
    });
    
    await this.gameRoundRepository.save(gameRound);
    
    // Emit created event
    this.eventEmitter.emit('game-round.created', new GameRoundCreatedEvent(gameRound));
    
    return gameRound;
  }

  /**
   * Find all game rounds with filtering options
   */
  async findAll(filterDto: GameRoundFilterDto): Promise<[GameRound[], number]> {
    return this.gameRoundRepository.getGameRounds(filterDto);
  }

  /**
   * Find game round by ID
   */
  async findOne(id: string): Promise<GameRound> {
    const gameRound = await this.gameRoundRepository.findOne(id, {
      relations: ['lyricSelections']
    });
    
    if (!gameRound) {
      throw new NotFoundException(`Game round with ID "${id}" not found`);
    }
    
    return gameRound;
  }

  /**
   * Update a game round
   */
  async update(
    id: string, 
    updateGameRoundDto: UpdateGameRoundDto, 
    user: User
  ): Promise<GameRound> {
    const gameRound = await this.findOne(id);
    
    // Check if the user is authorized to update this round
    if (gameRound.creatorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('You do not have permission to update this game round');
    }
    
    // Prevent updates to active or completed rounds
    if (gameRound.status !== GameRoundStatus.PENDING) {
      throw new BadRequestException(`Cannot update a game round with status ${gameRound.status}`);
    }
    
    // If songId is being updated, verify the song exists
    if (updateGameRoundDto.songId && updateGameRoundDto.songId !== gameRound.songId) {
      await this.songService.findOne(updateGameRoundDto.songId);
    }
    
    // Store previous state for event
    const previousState = { ...gameRound };
    
    // Update gameRound
    Object.assign(gameRound, updateGameRoundDto);
    await this.gameRoundRepository.save(gameRound);
    
    // Emit updated event
    this.eventEmitter.emit(
      'game-round.updated', 
      new GameRoundUpdatedEvent(gameRound, previousState)
    );
    
    return gameRound;
  }

  /**
   * Delete a game round
   */
  async remove(id: string, user: User): Promise<void> {
    const gameRound = await this.findOne(id);
    
    // Check if the user is authorized to delete this round
    if (gameRound.creatorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this game round');
    }
    
    // Prevent deletion of active rounds
    if (gameRound.status === GameRoundStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active game round');
    }
    
    // Execute in transaction to ensure data consistency
    await this.connection.transaction(async (manager) => {
      // First delete related lyric selections
      await manager.delete('lyric_selection', { gameRoundId: id });
      
      // Then delete the game round
      await manager.delete('game_round', { id });
    });
    
    // Emit deleted event
    this.eventEmitter.emit('game-round.deleted', new GameRoundDeletedEvent(id));
  }

  /**
   * Change game round status with proper state transitions
   */
  async changeStatus(
    id: string, 
    { status }: ChangeGameRoundStatusDto, 
    user: User
  ): Promise<GameRound> {
    const gameRound = await this.findOne(id);
    
    // Check if the user is authorized to update this round
    if (gameRound.creatorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('You do not have permission to change the status of this game round');
    }
    
    // Validate state transition
    this.validateStatusTransition(gameRound.status, status);
    
    return this.executeStatusChange(gameRound, status);
  }

  /**
   * Start a game round and change status to active
   */
  async startRound(id: string, user: User): Promise<GameRound> {
    const gameRound = await this.findOne(id);
    
    // Check if the user is authorized to start this round
    if (gameRound.creatorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('You do not have permission to start this game round');
    }
    
    // Ensure round is in PENDING status
    if (gameRound.status !== GameRoundStatus.PENDING) {
      throw new BadRequestException(`Cannot start a game round with status ${gameRound.status}`);
    }
    
    return this.executeStatusChange(gameRound, GameRoundStatus.ACTIVE);
  }

  /**
   * Complete a game round and change status to completed
   */
  async completeRound(id: string, user: User): Promise<GameRound> {
    const gameRound = await this.findOne(id);
    
    // Check if the user is authorized to complete this round
    if (gameRound.creatorId !== user.id && !user.isAdmin) {
      throw new ForbiddenException('You do not have permission to complete this game round');
    }
    
    // Ensure round is in ACTIVE status
    if (gameRound.status !== GameRoundStatus.ACTIVE) {
      throw new BadRequestException(`Cannot complete a game round with status ${gameRound.status}`);
    }
    
    return this.executeStatusChange(gameRound, GameRoundStatus.COMPLETED);
  }

  /**
   * Join a game round (add participant)
   */
  async joinRound(id: string, user: User): Promise<void> {
    const gameRound = await this.findOne(id);
    
    // Ensure round is in ACTIVE status
    if (gameRound.status !== GameRoundStatus.ACTIVE) {
      throw new BadRequestException(`Cannot join a game round with status ${gameRound.status}`);
    }
    
    // Check if the round has reached max participants
    if (gameRound.maxParticipants > 0) {
      const participantCount = await this.lyricSelectionService.countParticipants(id);
      if (participantCount >= gameRound.maxParticipants) {
        throw new BadRequestException('This game round has reached the maximum number of participants');
      }
    }
    
    // Check if user already joined
    const hasJoined = await this.lyricSelectionService.hasUserJoined(id, user.id);
    if (hasJoined) {
      throw new BadRequestException('You have already joined this game round');
    }
    
    // Mark user as participant by creating an initial empty lyric selection
    await this.lyricSelectionService.createInitialSelection(gameRound, user);
    
    // Emit participant joined event
    this.eventEmitter.emit(
      'game-round.participant.joined', 
      new ParticipantJoinedGameRoundEvent(gameRound, user.id)
    );
  }

  /**
   * Leave a game round (remove participant)
   */
  async leaveRound(id: string, user: User): Promise<void> {
    const gameRound = await this.findOne(id);
    
    // Ensure round is in ACTIVE status
    if (gameRound.status !== GameRoundStatus.ACTIVE) {
      throw new BadRequestException(`Cannot leave a game round with status ${gameRound.status}`);
    }
    
    // Check if user has joined
    const hasJoined = await this.lyricSelectionService.hasUserJoined(id, user.id);
    if (!hasJoined) {
      throw new BadRequestException('You have not joined this game round');
    }
    
    // Remove user's lyric selections
    await this.lyricSelectionService.removeUserSelections(id, user.id);
    
    // Emit participant left event
    this.eventEmitter.emit(
      'game-round.participant.left', 
      new ParticipantLeftGameRoundEvent(gameRound, user.id)
    );
  }

  /**
   * Get active games with player counts
   */
  async getActiveGamesWithPlayerCount(): Promise<any[]> {
    return this.gameRoundRepository.getActiveRoundsWithPlayerCount();
  }

  /**
   * Process round results and statistics after completion
   */
  async processRoundResults(id: string): Promise<any> {
    const gameRound = await this.findOne(id);
    
    // Ensure round is in COMPLETED status
    if (gameRound.status !== GameRoundStatus.COMPLETED) {
      throw new BadRequestException(`Cannot process results for a game round with status ${gameRound.status}`);
    }
    
    // Get all lyric selections for this round
    const lyricSelections = await this.lyricSelectionService.findAllForRound(id);
    
    // Calculate statistics and results
    const results = {
      roundId: id,
      totalParticipants: new Set(lyricSelections.map(selection => selection.userId)).size,
      totalSelections: lyricSelections.length,
      // Add more statistics as needed
    };
    
    // Save results to metadata
    gameRound.metadata = {
      ...gameRound.metadata,
      results
    };
    
    await this.gameRoundRepository.save(gameRound);
    
    return results;
  }

  /**
   * Scheduled task to start pending rounds that have reached their scheduled start time
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async startScheduledRounds(): Promise<void> {
    this.logger.debug('Checking for scheduled rounds to start');
    
    const roundsToStart = await this.gameRoundRepository.findRoundsToStart();
    
    for (const round of roundsToStart) {
      try {
        await this.executeStatusChange(round, GameRoundStatus.ACTIVE);
        this.logger.log(`Automatically started scheduled round: ${round.id}`);
      } catch (error) {
        this.logger.error(`Failed to start scheduled round ${round.id}:`, error);
      }
    }
  }

  /**
   * Scheduled task to complete active rounds that have exceeded their duration
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async completeExpiredRounds(): Promise<void> {
    this.logger.debug('Checking for expired rounds to complete');
    
    const roundsToComplete = await this.gameRoundRepository.findRoundsToComplete();
    
    for (const round of roundsToComplete) {
      try {
        await this.executeStatusChange(round, GameRoundStatus.COMPLETED);
        this.logger.log(`Automatically completed expired round: ${round.id}`);
      } catch (error) {
        this.logger.error(`Failed to complete expired round ${round.id}:`, error);
      }
    }
  }

  /**
   * Helper method to validate state transitions
   */
  private validateStatusTransition(currentStatus: GameRoundStatus, newStatus: GameRoundStatus): void {
    const validTransitions = {
      [GameRoundStatus.PENDING]: [GameRoundStatus.ACTIVE, GameRoundStatus.COMPLETED],
      [GameRoundStatus.ACTIVE]: [GameRoundStatus.COMPLETED],
      [GameRoundStatus.COMPLETED]: []
    };
    
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Cannot transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Helper method to execute status change with proper transaction safety
   */
  private async executeStatusChange(
    gameRound: GameRound, 
    newStatus: GameRoundStatus
  ): Promise<GameRound> {
    // Execute in transaction for data consistency
    return this.connection.transaction(async (manager: EntityManager) => {
      const previousStatus = gameRound.status;
      
      // Update status
      gameRound.status = newStatus;
      
      // Handle specific status transitions
      if (newStatus === GameRoundStatus.ACTIVE) {
        gameRound.actualStartTime = new Date();
      } else if (newStatus === GameRoundStatus.COMPLETED) {
        gameRound.endTime = new Date();
      }
      
      // Save the updated game round
      const updatedRound = await manager.save(GameRound, gameRound);
      
      // Emit status changed event
      this.eventEmitter.emit(
        'game-round.status.changed',
        new GameRoundStatusChangedEvent(updatedRound, previousStatus)
      );
      
      // Emit specific status events
      if (newStatus === GameRoundStatus.ACTIVE) {
        this.eventEmitter.emit('game-round.started', new GameRoundStartedEvent(updatedRound));
      } else if (newStatus === GameRoundStatus.COMPLETED) {
        this.eventEmitter.emit('game-round.completed', new GameRoundCompletedEvent(updatedRound));
      }
      
      return updatedRound;
    });
  }
}
