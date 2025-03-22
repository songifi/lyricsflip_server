// File: src/modules/player/test/player.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { PlayerService } from '../services/player.service';
import { Player, PlayerDocument, PlayerStatus } from '../schemas/player.schema';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('PlayerService', () => {
  let service: PlayerService;
  let model: Model<PlayerDocument>;
  let eventEmitter: EventEmitter2;

  const mockUserId = new Types.ObjectId().toString();
  const mockSessionId = new Types.ObjectId().toString();
  const mockPlayerId = new Types.ObjectId().toString();
  const mockQuestionId = new Types.ObjectId().toString();

  const mockPlayer = {
    _id: mockPlayerId,
    userId: mockUserId,
    sessionId: mockSessionId,
    status: PlayerStatus.JOINED,
    joinedAt: new Date(),
    score: 0,
    position: 0,
    activeTime: 0,
    lastActive: new Date(),
    answers: [],
    correctAnswers: 0,
    metadata: {},
    save: jest.fn().mockImplementation(function() { return Promise.resolve(this); })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: getModelToken(Player.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockPlayer),
            constructor: jest.fn().mockResolvedValue(mockPlayer),
            findOne: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            updateMany: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlayerService>(PlayerService);
    model = module.get<Model<PlayerDocument>>(getModelToken(Player.name));
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new player successfully', async () => {
      const createPlayerDto: CreatePlayerDto = {
        sessionId: mockSessionId,
      };

      jest.spyOn(model, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      jest.spyOn(model, 'new').mockReturnValue(mockPlayer as any);
      
      const result = await service.create(mockUserId, createPlayerDto);
      
      expect(result).toEqual(mockPlayer);
      expect(eventEmitter.emit).toHaveBeenCalledWith('player.joined', expect.any(Object));
    });

    it('should allow rejoining if player previously left', async () => {
      const createPlayerDto: CreatePlayerDto = {
        sessionId: mockSessionId,
      };

      const leftPlayer = {
        ...mockPlayer,
        status: PlayerStatus.LEFT,
        save: jest.fn().mockResolvedValue({ ...mockPlayer, status: PlayerStatus.JOINED }),
      };

      jest.spyOn(model, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(leftPlayer),
      } as any);
      
      const result = await service.create(mockUserId, createPlayerDto);
      
      expect(result.status).toEqual(PlayerStatus.JOINED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('player.rejoined', expect.any(Object));
    });

    it('should throw ConflictException if player already exists', async () => {
      const createPlayerDto: CreatePlayerDto = {
        sessionId: mockSessionId,
      };

      jest.spyOn(model, 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPlayer, status: PlayerStatus.ACTIVE }),
      } as any);
      
      await expect(service.create(mockUserId, createPlayerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    it('should return a player if found', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPlayer),
      } as any);

      const result = await service.findById(mockPlayerId);
      expect(result).toEqual(mockPlayer);
    });

    it('should throw NotFoundException if player not found', async () => {
      jest.spyOn(model, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.findById(mockPlayerId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitAnswer', () => {
    it('should submit answer and update player score', async () => {
      const submitAnswerDto: SubmitAnswerDto = {
        questionId: mockQuestionId,
        value: 'option_1',
        isCorrect: true,
        timeToAnswer: 3500,
        pointsEarned: 100,
      };

      const activePlayer = {
        ...mockPlayer,
        status: PlayerStatus.ACTIVE,
        score: 0,
        correctAnswers: 0,
        answers: [],
        save: jest.fn().mockImplementation(function() {
          this.score += submitAnswerDto.pointsEarned;
          this.correctAnswers += 1;
          this.answers.push({
            questionId: mockQuestionId,
            ...submitAnswerDto
          });
          return Promise.resolve(this);
        })
      };

      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(activePlayer),
      } as any);

      const result = await service.submitAnswer(mockPlayerId, submitAnswerDto);
      
      expect(result.score).toEqual(100);
      expect(result.correctAnswers).toEqual(1);
      expect(result.answers.length).toEqual(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith('player.answer.submitted', expect.any(Object));
    });

    it('should throw BadRequestException if player is not active', async () => {
      const submitAnswerDto: SubmitAnswerDto = {
        questionId: mockQuestionId,
        value: 'option_1',
        isCorrect: true,
        timeToAnswer: 3500,
      };

      jest.spyOn(model, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockPlayer, status: PlayerStatus.JOINED }),
      } as any);

      await expect(service.submitAnswer(mockPlayerId, submitAnswerDto)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  // Add more tests for other methods...
});
