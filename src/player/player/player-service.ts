// src/modules/player/player.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Player, PlayerStatus } from './schemas/player.schema';
import { User } from '../user/schemas/user.schema';
import { GameSession, GameSessionStatus } from '../game-session/schemas/game-session.schema';
import { PlayerJoinDto } from './dto/player-join.dto';
import { PlayerEvents } from './player.events';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);
  private readonly activeConnections = new Map<string, string>(); // userId -> socketId
  private readonly playerSessions = new Map<string, string>(); // socketId -> sessionId

  constructor(
    @InjectModel(Player.name) private playerModel: Model<Player>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(GameSession.name) private gameSessionModel: Model<GameSession>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Join a game session
   */
  async joinSession(
    userId: string,
    sessionId: string,
    joinDto: PlayerJoinDto,
    socketId: string,
  ): Promise<Player> {
    // Validate session exists and is joinable
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status !== GameSessionStatus.WAITING && session.status !== GameSessionStatus.CREATED) {
      throw new BadRequestException('Cannot join a session that has already started or ended');
    }

    // Check if session is full (except for spectators)
    if (!joinDto.isSpectator) {
      const activePlayers = await this.playerModel.countDocuments({
        sessionId,
        status: { $in: [PlayerStatus.ACTIVE, PlayerStatus.NOT_READY] },
        isSpectator: false,
      });

      if (session.maxPlayers && activePlayers >= session.maxPlayers) {
        throw new BadRequestException('Game session is full');
      }
    }

    // Check if player already exists in this session
    let player = await this.playerModel.findOne({
      userId,
      sessionId,
    });

    if (player) {
      // Player is rejoining
      if (player.status === PlayerStatus.LEFT || player.status === PlayerStatus.DISCONNECTED) {
        player.status = joinDto.isSpectator 
          ? PlayerStatus.SPECTATING 
          : PlayerStatus.NOT_READY;
        player.socketId = socketId;
        player.isSpectator = joinDto.isSpectator;
        player.updatedAt = new Date();
        await player.save();
        
        this.registerConnection(userId, socketId, sessionId);
        
        // Emit player rejoined event
        this.eventEmitter.emit(PlayerEvents.PLAYER_REJOINED, {
          playerId: player._id,
          sessionId,
          userId,
          isSpectator: player.isSpectator,
        });
      } else {
        // Player is already in session, update socket ID
        player.socketId = socketId;
        player.updatedAt = new Date();
        await player.save();
        
        this.registerConnection(userId, socketId, sessionId);
      }
    } else {
      // Create new player
      player = new this.playerModel({
        userId,
        sessionId,
        socketId,
        status: joinDto.isSpectator ? PlayerStatus.SPECTATING : PlayerStatus.NOT_READY,
        isSpectator: joinDto.isSpectator,
        joinedAt: new Date(),
        score: 0,
        updatedAt: new Date(),
      });
      
      await player.save();
      
      this.registerConnection(userId, socketId, sessionId);
      
      // Emit player joined event
      this.eventEmitter.emit(PlayerEvents.PLAYER_JOINED, {
        playerId: player._id,
        sessionId,
        userId,
        isSpectator: player.isSpectator,
      });
    }

    return player;
  }

  /**
   * Leave a game session
   */
  async leaveSession(userId: string, sessionId: string): Promise<void> {
    const player = await this.playerModel.findOne({
      userId,
      sessionId,
    });

    if (!player) {
      throw new NotFoundException('Player not found in this session');
    }

    player.status = PlayerStatus.LEFT;
    player.updatedAt = new Date();
    await player.save();

    // Remove from active connections
    if (player.socketId) {
      this.playerSessions.delete(player.socketId);
    }
    this.activeConnections.delete(userId);

    // Emit player left event
    this.eventEmitter.emit(PlayerEvents.PLAYER_LEFT, {
      playerId: player._id,
      sessionId,
      userId,
    });
  }

  /**
   * Mark player as ready
   */
  async setReady(userId: string, sessionId: string, isReady: boolean): Promise<Player> {
    const player = await this.playerModel.findOne({
      userId,
      sessionId,
    });

    if (!player) {
      throw new NotFoundException('Player not found in this session');
    }

    if (player.isSpectator) {
      throw new BadRequestException('Spectators cannot set ready status');
    }

    player.status = isReady ? PlayerStatus.READY : PlayerStatus.NOT_READY;
    player.updatedAt = new Date();
    await player.save();

    // Emit player ready status changed event
    this.eventEmitter.emit(PlayerEvents.PLAYER_READY_CHANGED, {
      playerId: player._id,
      sessionId,
      userId,
      isReady,
    });

    return player;
  }

  /**
   * Toggle spectator mode
   */
  async toggleSpectator(userId: string, sessionId: string): Promise<Player> {
    const player = await this.playerModel.findOne({
      userId,
      sessionId,
    });

    if (!player) {
      throw new NotFoundException('Player not found in this session');
    }

    // Get session to check if already started
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.status === GameSessionStatus.ACTIVE) {
      // If game already started, can only switch to spectator, not from spectator
      if (!player.isSpectator) {
        player.isSpectator = true;
        player.status = PlayerStatus.SPECTATING;
      } else {
        throw new BadRequestException('Cannot switch from spectator once game has started');
      }
    } else {
      // If game not started, can toggle freely
      player.isSpectator = !player.isSpectator;
      player.status = player.isSpectator 
        ? PlayerStatus.SPECTATING 
        : PlayerStatus.NOT_READY;
    }

    player.updatedAt = new Date();
    await player.save();

    // Emit spectator status changed event
    this.eventEmitter.emit(PlayerEvents.SPECTATOR_CHANGED, {
      playerId: player._id,
      sessionId,
      userId,
      isSpectator: player.isSpectator,
    });

    return player;
  }

  /**
   * Handle player disconnection
   */
  async handleDisconnection(socketId: string): Promise<void> {
    // Find player by socket ID
    const player = await this.playerModel.findOne({ socketId });
    
    if (!player) {
      // Socket wasn't associated with a player
      return;
    }

    // Remove from connection tracking
    const sessionId = this.playerSessions.get(socketId);
    this.playerSessions.delete(socketId);
    this.activeConnections.delete(player.userId.toString());

    // Mark as disconnected in database
    player.status = PlayerStatus.DISCONNECTED;
    player.updatedAt = new Date();
    await player.save();

    // Emit player disconnected event
    this.eventEmitter.emit(PlayerEvents.PLAYER_DISCONNECTED, {
      playerId: player._id,
      sessionId: player.sessionId,
      userId: player.userId,
    });
  }

  /**
   * Get all players in a session
   */
  async getSessionPlayers(sessionId: string): Promise<Player[]> {
    return this.playerModel
      .find({ sessionId })
      .populate('userId', 'username profile.avatar')
      .sort({ joinedAt: 1 })
      .exec();
  }

  /**
   * Get active players in a session (not spectators)
   */
  async getActivePlayers(sessionId: string): Promise<Player[]> {
    return this.playerModel
      .find({ 
        sessionId, 
        isSpectator: false,
        status: { $in: [PlayerStatus.ACTIVE, PlayerStatus.READY, PlayerStatus.NOT_READY] }
      })
      .populate('userId', 'username profile.avatar')
      .sort({ joinedAt: 1 })
      .exec();
  }

  /**
   * Get spectators in a session
   */
  async getSpectators(sessionId: string): Promise<Player[]> {
    return this.playerModel
      .find({ 
        sessionId, 
        isSpectator: true,
        status: PlayerStatus.SPECTATING
      })
      .populate('userId', 'username profile.avatar')
      .sort({ joinedAt: 1 })
      .exec();
  }

  /**
   * Check if all players are ready
   */
  async areAllPlayersReady(sessionId: string): Promise<boolean> {
    const activePlayers = await this.playerModel.countDocuments({
      sessionId,
      isSpectator: false,
      status: { $in: [PlayerStatus.ACTIVE, PlayerStatus.READY, PlayerStatus.NOT_READY] }
    });
    
    const readyPlayers = await this.playerModel.countDocuments({
      sessionId,
      isSpectator: false,
      status: PlayerStatus.READY
    });
    
    return activePlayers > 0 && activePlayers === readyPlayers;
  }

  /**
   * Kick a player from a session
   */
  async kickPlayer(
    adminUserId: string, 
    sessionId: string, 
    playerToKickId: string
  ): Promise<void> {
    // Check if admin is session creator or admin
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Game session not found');
    }

    if (session.createdBy.toString() !== adminUserId) {
      throw new ForbiddenException('Only session creator can kick players');
    }

    // Find player to kick
    const playerToKick = await this.playerModel.findById(playerToKickId);
    if (!playerToKick || playerToKick.sessionId.toString() !== sessionId) {
      throw new NotFoundException('Player not found in this session');
    }

    // Mark player as kicked
    playerToKick.status = PlayerStatus.KICKED;
    playerToKick.updatedAt = new Date();
    await playerToKick.save();

    // Remove from active connections
    if (playerToKick.socketId) {
      this.playerSessions.delete(playerToKick.socketId);
      this.activeConnections.delete(playerToKick.userId.toString());
    }

    // Emit player kicked event
    this.eventEmitter.emit(PlayerEvents.PLAYER_KICKED, {
      playerId: playerToKick._id,
      sessionId,
      userId: playerToKick.userId,
      kickedBy: adminUserId,
    });
  }

  /**
   * Update player status for a session (e.g., on game start)
   */
  async updateSessionPlayerStatus(
    sessionId: string, 
    newStatus: PlayerStatus, 
    excludeSpectators: boolean = true
  ): Promise<void> {
    const filter: any = { sessionId };
    
    if (excludeSpectators) {
      filter.isSpectator = false;
    }

    await this.playerModel.updateMany(
      filter,
      { 
        $set: { 
          status: newStatus,
          updatedAt: new Date()
        } 
      }
    );

    // Emit players status updated event
    this.eventEmitter.emit(PlayerEvents.PLAYERS_STATUS_UPDATED, {
      sessionId,
      newStatus,
    });
  }

  /**
   * Register user connection
   */
  private registerConnection(userId: string, socketId: string, sessionId: string): void {
    this.activeConnections.set(userId, socketId);
    this.playerSessions.set(socketId, sessionId);
    this.logger.debug(`User ${userId} connected to session ${sessionId} with socket ${socketId}`);
  }

  /**
   * Check if a user is already connected to another session
   */
  async checkActiveSession(userId: string): Promise<string | null> {
    const player = await this.playerModel.findOne({
      userId,
      status: { $in: [PlayerStatus.ACTIVE, PlayerStatus.READY, PlayerStatus.NOT_READY, PlayerStatus.SPECTATING] }
    });

    return player ? player.sessionId.toString() : null;
  }
}
