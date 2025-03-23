import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from '../controllers/activity.controller';
import { ActivityService } from '../services/activity.service';
import { ActivityType, ContentType } from '../schemas/activity.schema';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { Types } from 'mongoose';

describe('ActivityController', () => {
  let activityController: ActivityController;
  let activityService: ActivityService;

  const mockUserId = new Types.ObjectId().toString();
  const mockContentId = new Types.ObjectId().toString();
  const mockActivityId = new Types.ObjectId().toString();

  const mockActivity = {
    _id: mockActivityId,
    userId: { _id: mockUserId, name: 'Test User' },
    contentId: mockContentId,
    activityType: ActivityType.LIKE,
    contentType: ContentType.POST,
    metadata: { postTitle: 'Test Post' },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [
        {
          provide: ActivityService,
          useValue: {
            createActivity: jest.fn(),
            queryActivities: jest.fn(),
            getUserFeed: jest.fn(),
            getRecentUserActivity: jest.fn(),
            getContentStats: jest.fn(),
            getActivityById: jest.fn(),
            deleteActivity: jest.fn(),
          },
        },
      ],
    }).compile();

    activityController = module.get<ActivityController>(ActivityController);
    activityService = module.get<ActivityService>(ActivityService);
  });

  it('should be defined', () => {
    expect(activityController).toBeDefined();
  });

  describe('createActivity', () => {
    it('should create and return an activity', async () => {
      const createActivityDto: CreateActivityDto = {
        userId: 'other-user-id', // This should be overridden
        contentId: mockContentId,
        activityType: ActivityType.COMMENT,
        contentType: ContentType.POST,
        metadata: { text: 'Great post!' },
      };

      jest.spyOn(activityService, 'createActivity').mockResolvedValue(mockActivity as any);

      const result = await activityController.createActivity(mockUserId, createActivityDto);
      
      // Check that the userId was overridden with the authenticated user
      expect(createActivityDto.userId).toBe(mockUserId);
      expect(activityService.createActivity).toHaveBeenCalledWith(createActivityDto);
      expect(result).toBeDefined();
    });
  });

  // Add more test cases for other methods
});
