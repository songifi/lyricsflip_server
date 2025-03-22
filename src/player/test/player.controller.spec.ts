// File: src/modules/player/test/player.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PlayerController } from '../controllers/player.controller';
import { PlayerService } from '../services/player.service';
import { CreatePlayerDto } from '../dto/create-player.dto';
import { UpdatePlayerStatusDto } from '../dto/update-player-status.dto';
import { SubmitAnswerDto } from '../dto/submit-answer.dto';
import { PlayerStatus } from '../schemas/player.schema';

describe('PlayerController', () => {
  let controller: PlayerController;
  let service: PlayerService;

  const mockUserId = 'user123';
  const mockSessionId = 'session123';
  const mockPlayerId = 'player123';

  const mockPlayer = {
    _id: mockPlayerId,
    userId: { _id: mockUserId, username: 'testuser', name: 'Test User' },
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayerController],
      providers: [
        {
          provide: PlayerService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findBySession: jest.fn(),
            getLeaderboard: jest.fn(),
            findByUserAndSession: jest.fn(),
            updateStatus: jest.fn(),
            submitAnswer: jest.fn(),
            updateMetadata: jest.fn(),
            resetSessionScores: jest.fn(),
            getPlayerHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PlayerController>(PlayerController);
    service = module.get<PlayerService>(PlayerService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a player', async () => {
      const createPlayerDto: CreatePlayerDto = {
        sessionId: mockSessionId,
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockPlayer as any);

      const result = await controller.create(mockUserId, createPlayerDto);
      expect(service.create).toHaveBeenCalledWith(mockUserId, createPlayerDto);
      expect(result.id).toBe(mockPlayerId);
    });
  });

  describe('findOne', () => {
    it('should get a player by ID', async () => {
      jest.spyOn(service, 'findById').mockResolvedValue(mockPlayer as any);

      const result = await controller.findOne(mockPlayerId);
      expect(service.findById).toHaveBeenCalledWith(mockPlayerId);
      expect(result.id).toBe(mockPlayerId);
    });
  });

  describe('updateStatus', () => {
    it('should update player status', async () => {
      const updateStatusDto: UpdatePlayerStatusDto = {
        status: PlayerStatus.ACTIVE,
      };

      const updatedPlayer = { 
        ...mockPlayer, 
        status: PlayerStatus.ACTIVE 
      };

      jest.spyOn(service, 'updateStatus').mockResolvedValue(updatedPlayer as any);

      const result = await controller.updateStatus(mockPlayerId, updateStatusDto);
      expect(service.updateStatus).toHaveBeenCalledWith(mockPlayerId, updateStatusDto);
      expect(result.status).toBe(PlayerStatus.ACTIVE);
    });
  });

  describe('submitAnswer', () => {
    it('should submit an answer', async () => {
      const submitAnswerDto: SubmitAnswerDto = {
        questionId: 'question123',
        value: 'option_2',
        isCorrect: true,
        timeToAnswer: 2500,
        pointsEarned: 150,
      };

      const playerWithAnswer = {
        ...mockPlayer,
        status: PlayerStatus.ACTIVE,
        score: 150,
        correctAnswers: 1,
        answers: [
          {
            questionId: 'question123',
            value: 'option_2',
            isCorrect: true,
            timeToAnswer: 2500,
            pointsEarned: 150,
            submittedAt: new Date(),
          },
        ],
      };

      jest.spyOn(service, 'submitAnswer').mockResolvedValue(playerWithAnswer as any);

      const result = await controller.submitAnswer(mockPlayerId, submitAnswerDto);
      expect(service.submitAnswer).toHaveBeenCalledWith(mockPlayerId, submitAnswerDto);
      expect(result.score).toBe(150);
      expect(result.answers.length).toBe(1);
    });
  });

  // Add more test cases for other controller methods...
});
