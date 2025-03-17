import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameSession, GameSessionDocument } from '../schemas/game-session.schema';
import { CreateGameSessionDto } from '../game-session/dto/create-game-session.dto';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import rateLimit from 'express-rate-limit';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, 
	standardHeaders: 'draft-8',
	legacyHeaders: false, 
})

@Injectable()
export class GameSessionService {
  private sessionAttempts = new Map<string, { count: number; timestamp: number }>();

  constructor(
    @InjectModel(GameSession.name) private readonly gameSessionModel: Model<GameSessionDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private checkRateLimit(userId: string): void {
    const currentTime = Date.now();
    const userAttempts = this.sessionAttempts.get(userId) || { count: 0, timestamp: currentTime };
    
    if (currentTime - userAttempts.timestamp > 15 * 60 * 1000) {
      this.sessionAttempts.set(userId, { count: 1, timestamp: currentTime });
    } else {
      if (userAttempts.count >= 5) {
        throw new BadRequestException('Too many session creation attempts. Please try again later.');
      }
      userAttempts.count++;
      this.sessionAttempts.set(userId, userAttempts);
    }
  }

  async create(userId: string, createGameSessionDto: CreateGameSessionDto): Promise<GameSession> {
    this.checkRateLimit(userId);
    const session = new this.gameSessionModel({
      ...createGameSessionDto,
      id: uuidv4(),
      roomCode: this.generateRoomCode(),
      host: userId,
    });
    
    await session.save();
    this.eventEmitter.emit('gameSession.created', session);
    return session;
  }

  async findAll(): Promise<GameSession[]> {
    return await this.gameSessionModel.find().exec();
  }

  async findOne(id: string): Promise<GameSession> {
    const session = await this.gameSessionModel.findOne({ id }).exec();
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    return session;
  }

  async update(userId: string, id: string, updateGameSessionDto: UpdateGameSessionDto): Promise<GameSession> {
    const session = await this.findOne(id);
    if (session.host !== userId) {
      throw new ForbiddenException('You are not authorized to update this session');
    }
    
    Object.assign(session, updateGameSessionDto);
    await this.gameSessionModel.updateOne({ id }, session).exec();
    this.eventEmitter.emit('gameSession.updated', session);
    return session;
  }

  async remove(userId: string, id: string): Promise<void> {
    const session = await this.findOne(id);
    if (session.host !== userId) {
      throw new ForbiddenException('You are not authorized to delete this session');
    }
    
    await this.gameSessionModel.findOneAndDelete({ id }).exec();
    this.eventEmitter.emit('gameSession.deleted', { id });
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }
}