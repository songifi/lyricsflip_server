import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameSession, GameSessionDocument } from '../schemas/game-session.schema';
import { CreateGameSessionDto } from './dto/create-game-session.dto';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateGameSessionDto } from './dto/update-game-session.dto';

@Injectable()
export class GameSessionService {
  constructor(
    @InjectModel(GameSession.name) private readonly gameSessionModel: Model<GameSessionDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createGameSessionDto: CreateGameSessionDto): Promise<GameSession> {
    const session = new this.gameSessionModel({
      ...createGameSessionDto,
      id: uuidv4(),
      roomCode: this.generateRoomCode(),
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

  async update(id: string, updateGameSessionDto: UpdateGameSessionDto): Promise<GameSession> {
    const session = await this.gameSessionModel.findOneAndUpdate({ id }, updateGameSessionDto, { new: true }).exec();
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    this.eventEmitter.emit('gameSession.updated', session);
    return session;
  }

  async remove(id: string): Promise<void> {
    const session = await this.gameSessionModel.findOneAndDelete({ id }).exec();
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    this.eventEmitter.emit('gameSession.deleted', { id });
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }
}
