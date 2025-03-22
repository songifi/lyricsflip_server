
import { Test, TestingModule } from '@nestjs/testing';
import { ContentDiscoveryController } from '../controllers/content-discovery.controller';
import { ContentDiscoveryService } from '../services/content-discovery.service';

describe('ContentDiscoveryController', () => {
  let controller: ContentDiscoveryController;
  let service: ContentDiscoveryService;

  const mockUserId = 'user123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentDiscoveryController],
      providers: [
        {
          provide: ContentDiscoveryService,
          useValue: {
            getPersonalizedRecommendations: jest.fn(),
            getTrendingContent: jest.fn(),
            getNetworkTrending: jest.fn(),
            getPeopleYouMayKnow: jest.fn(),
            enhanceSearchResults: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ContentDiscoveryController>(ContentDiscoveryController);
    service = module.get<ContentDiscoveryService>(ContentDiscoveryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations', async () => {
      const mockRecommendations = [
        { _id: '1', title: 'Content 1' },
        { _id: '2', title: 'Content 2' },
      ];
      
      jest.spyOn(service, 'getPersonalizedRecommendations').mockResolvedValue(mockRecommendations);
      
      const result = await controller.getRecommendations(mockUserId);
      
      expect(service.getPersonalizedRecommendations).toHaveBeenCalledWith(mockUserId, 20);
      expect(result).toEqual(mockRecommendations);
    });

    it('should limit recommendations to 50 items max', async () => {
      const mockRecommendations = Array(50).fill({ _id: '1', title: 'Content' });
      
      jest.spyOn(service, 'getPersonalizedRecommendations').mockResolvedValue(mockRecommendations);
      
      const result = await controller.getRecommendations(mockUserId, 100);
      
      expect(service.getPersonalizedRecommendations).toHaveBeenCalledWith(mockUserId, 50);
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('getTrending', () => {
    it('should return trending content', async () => {
      const mockTrending = [
        { _id: '1', title: 'Trending 1', trendingScore: 95 },
        { _id: '2', title: 'Trending 2', trendingScore: 90 },
      ];
      
      jest.spyOn(service, 'getTrendingContent').mockResolvedValue(mockTrending);
      
      const result = await controller.getTrending();
      
      expect(service.getTrendingContent).toHaveBeenCalledWith(20);
      expect(result).toEqual(mockTrending);
    });
  });

  describe('enhanceSearch', () => {
    it('should enhance search results with social signals', async () => {
      const mockQuery = 'test query';
      const mockResults = [
        { _id: '1', title: 'Result 1', _score: 0.8 },
        { _id: '2', title: 'Result 2', _score: 0.7 },
      ];
      const mockEnhancedResults = [
        { _id: '1', title: 'Result 1', _score: 0.8, _enhancedScore: 0.9 },
        { _id: '2', title: 'Result 2', _score: 0.7, _enhancedScore: 0.85 },
      ];
      
      jest.spyOn(service, 'enhanceSearchResults').mockResolvedValue(mockEnhancedResults);
      
      const result = await controller.enhanceSearch(
        mockUserId, 
        mockQuery, 
        JSON.stringify(mockResults)
      );
      
      expect(service.enhanceSearchResults).toHaveBeenCalledWith(
        mockUserId, 
        mockResults, 
        mockQuery
      );
      expect(result).toEqual(mockEnhancedResults);
    });

    it('should handle invalid JSON in search results', async () => {
      const mockQuery = 'test query';
      const invalidJson = '{invalid:json}';
      
      await expect(
        controller.enhanceSearch(mockUserId, mockQuery, invalidJson)
      ).rejects.toThrow('Invalid search results format');
    });
  });
});