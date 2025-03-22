
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ContentDiscoveryService } from '../services/content-discovery.service';
import { ScoringService } from '../services/scoring.service';
import { RecommendationCacheService } from '../services/recommendation-cache.service';
import { ABTestingService } from '../services/ab-testing.service';
import { Content } from '../../content/schemas/content.schema';
import { User } from '../../user/schemas/user.schema';
import { Interaction } from '../../interaction/schemas/interaction.schema';
import { Connection } from '../../social/schemas/connection.schema';
import { Types } from 'mongoose';

describe('ContentDiscoveryService', () => {
  let service: ContentDiscoveryService;
  let scoringService: ScoringService;
  let cacheService: RecommendationCacheService;
  let abTestingService: ABTestingService;
  let contentModel: any;
  let userModel: any;
  let interactionModel: any;
  let connectionModel: any;

  const mockUserId = new Types.ObjectId().toString();
  const mockContentId = new Types.ObjectId().toString();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentDiscoveryService,
        {
          provide: ScoringService,
          useValue: {
            calculatePopularityScore: jest.fn().mockReturnValue(80),
            calculateQualityScore: jest.fn().mockReturnValue(0.8),
            normalizeScore: jest.fn().mockImplementation((score) => score),
          },
        },
        {
          provide: RecommendationCacheService,
          useValue: {
            getRecommendations: jest.fn(),
            cacheRecommendations: jest.fn(),
            getGlobalRecommendations: jest.fn(),
            cacheGlobalRecommendations: jest.fn(),
            invalidateRecommendations: jest.fn(),
            invalidateGlobalRecommendations: jest.fn(),
          },
        },
        {
          provide: ABTestingService,
          useValue: {
            getRecommendationAlgorithm: jest.fn().mockReturnValue('hybrid'),
            getExperimentVariant: jest.fn(),
            recordConversion: jest.fn(),
          },
        },
        {
          provide: getModelToken(Content.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            updateOne: jest.fn(),
            aggregate: jest.fn(),
            exec: jest.fn(),
            sort: jest.fn(),
            limit: jest.fn(),
            populate: jest.fn(),
            lean: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            exec: jest.fn(),
            sort: jest.fn(),
            limit: jest.fn(),
            select: jest.fn(),
            lean: jest.fn(),
          },
        },
        {
          provide: getModelToken(Interaction.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            aggregate: jest.fn(),
            exec: jest.fn(),
            sort: jest.fn(),
            limit: jest.fn(),
            populate: jest.fn(),
            lean: jest.fn(),
          },
        },
        {
          provide: getModelToken(Connection.name),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            exec: jest.fn(),
            select: jest.fn(),
            lean: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => defaultValue),
          },
        },
        {
          provide: SchedulerRegistry,
          useValue: {
            addCronJob: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContentDiscoveryService>(ContentDiscoveryService);
    scoringService = module.get<ScoringService>(ScoringService);
    cacheService = module.get<RecommendationCacheService>(RecommendationCacheService);
    abTestingService = module.get<ABTestingService>(ABTestingService);
    contentModel = module.get(getModelToken(Content.name));
    userModel = module.get(getModelToken(User.name));
    interactionModel = module.get(getModelToken(Interaction.name));
    connectionModel = module.get(getModelToken(Connection.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return cached recommendations if available', async () => {
      const mockRecommendations = [
        { _id: '1', title: 'Content 1' },
        { _id: '2', title: 'Content 2' },
      ];
      
      jest.spyOn(cacheService, 'getRecommendations').mockResolvedValue(mockRecommendations);
      
      const result = await service.getPersonalizedRecommendations(mockUserId);
      
      expect(cacheService.getRecommendations).toHaveBeenCalledWith(mockUserId, 'personalized', 20);
      expect(result).toEqual(mockRecommendations);
      expect(cacheService.cacheRecommendations).not.toHaveBeenCalled();
    });

    it('should fetch recommendations using algorithm from A/B testing', async () => {
      // No cache hit
      jest.spyOn(cacheService, 'getRecommendations').mockResolvedValue(null);
      
      // Set up hybrid recommendation mock return
      const mockRecommendations = [
        { _id: '1', title: 'Content 1' },
        { _id: '2', title: 'Content 2' },
      ];
      
      // Mock the private method using any (for testing)
      service['hybridRecommendations'] = jest.fn().mockResolvedValue(mockRecommendations);
      
      const result = await service.getPersonalizedRecommendations(mockUserId);
      
      expect(abTestingService.getRecommendationAlgorithm).toHaveBeenCalledWith(mockUserId);
      expect(service['hybridRecommendations']).toHaveBeenCalledWith(mockUserId, 20);
      expect(cacheService.cacheRecommendations).toHaveBeenCalledWith(
        mockUserId, 
        'personalized', 
        mockRecommendations,
        expect.any(Number)
      );
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('getTrendingContent', () => {
    it('should return cached trending content if available', async () => {
      const mockTrending = [
        { _id: '1', title: 'Trending 1', trendingScore: 95 },
        { _id: '2', title: 'Trending 2', trendingScore: 90 },
      ];
      
      jest.spyOn(cacheService, 'getGlobalRecommendations').mockResolvedValue(mockTrending);
      
      const result = await service.getTrendingContent();
      
      expect(cacheService.getGlobalRecommendations).toHaveBeenCalledWith('trending', 20);
      expect(result).toEqual(mockTrending);
      expect(contentModel.find).not.toHaveBeenCalled();
    });

    it('should fetch trending content from database if not cached', async () => {
      const mockTrending = [
        { _id: '1', title: 'Trending 1', trendingScore: 95 },
        { _id: '2', title: 'Trending 2', trendingScore: 90 },
      ];
      
      jest.spyOn(cacheService, 'getGlobalRecommendations').mockResolvedValue(null);
      
      contentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTrending),
      });
      
      const result = await service.getTrendingContent();
      
      expect(contentModel.find).toHaveBeenCalledWith({ trendingScore: { $gt: 0 } });
      expect(cacheService.cacheGlobalRecommendations).toHaveBeenCalledWith(
        'trending', 
        mockTrending,
        expect.any(Number)
      );
      expect(result).toEqual(mockTrending);
    });
  });

  describe('getPeopleYouMayKnow', () => {
    it('should return people suggestions from 2nd degree connections', async () => {
      const mockConnections = [
        { fromUser: mockUserId, toUser: 'user1' },
        { toUser: mockUserId, fromUser: 'user2' },
      ];
      
      const mockSecondDegreeConnections = [
        { fromUser: 'user1', toUser: 'user3' },
        { fromUser: 'user2', toUser: 'user4' },
        { fromUser: 'user1', toUser: 'user5' },
        { fromUser: 'user2', toUser: 'user3' }, // user3 is connected to both user1 and user2
      ];
      
      const mockUsers = [
        { _id: 'user3', name: 'User 3', username: 'user3' },
        { _id: 'user4', name: 'User 4', username: 'user4' },
        { _id: 'user5', name: 'User 5', username: 'user5' },
      ];
      
      // Mock cache miss
      jest.spyOn(cacheService, 'getRecommendations').mockResolvedValue(null);
      
      // Mock connections
      connectionModel.find.mockImplementation((query) => {
        if (query.$or && (query.$or[0].fromUser === mockUserId || query.$or[0].toUser === mockUserId)) {
          return {
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockConnections),
          };
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockSecondDegreeConnections),
          };
        }
      });
      
      // Mock user lookup
      userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUsers),
      });
      
      const result = await service.getPeopleYouMayKnow(mockUserId);
      
      expect(cacheService.getRecommendations).toHaveBeenCalledWith(mockUserId, 'people-suggestions', 20);
      expect(connectionModel.find).toHaveBeenCalledTimes(2);
      expect(userModel.find).toHaveBeenCalled();
      expect(cacheService.cacheRecommendations).toHaveBeenCalled();
      
      // Check sorting by connection strength
      expect(result[0]._id).toBe('user3'); // user3 has 2 mutual connections
      expect(result.length).toBe(3);
    });
  });
});
