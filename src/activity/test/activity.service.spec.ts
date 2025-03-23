import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityService } from '../services/activity.service';
import { Activity, ActivityDocument, ActivityType, ContentType } from '../schemas/activity.schema';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ActivityService', () => {
  let activityService: ActivityService;
  let activityModel: Model<ActivityDocument>;

  const mockUserId = new Types.ObjectId().toString();
  const mockContentId = new Types.ObjectId().toString();
  const mockActivityId = new Types.ObjectId().toString();

  const mockActivity = {
    _id: mockActivityId,
    userId: mockUserId,
    contentId: mockContentId,
    activityType: ActivityType.LIKE,
    contentType: ContentType.POST,
    metadata: { postTitle: 'Test Post' },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: getModelToken(Activity.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockActivity),
            constructor: jest.fn().mockResolvedValue(mockActivity),
            findOne: jest.fn(),
            find: jest.fn(),
            findById: jest.fn(),
            aggregate: jest.fn(),
            countDocuments: jest.fn(),
            exec: jest.fn(),
            save: jest.fn(),
            deleteOne: jest.fn(),
          },
        },
      ],
    }).compile();

    activityService = module.get<ActivityService>(ActivityService);
    activityModel = module.get<Model<ActivityDocument>>(getModelToken(Activity.name));
  });

  it('should be defined', () => {
    expect(activityService).toBeDefined();
  });

  describe('createActivity', () => {
    it('should create a new activity successfully', async () => {
      const createActivityDto: CreateActivityDto = {
        userId: mockUserId,
        contentId: mockContentId,
        activityType: ActivityType.COMMENT,
        contentType: ContentType.POST,
        metadata: { text: 'Great post!' },
      };

      jest.spyOn(activityModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(activityModel.prototype, 'save').mockResolvedValue(mockActivity);

      const result = await activityService.createActivity(createActivityDto);
      expect(result).toEqual(mockActivity);
    });

    it('should throw BadRequestException for duplicate like activity', async () => {
      const createActivityDto: CreateActivityDto = {
        userId: mockUserId,
        contentId: mockContentId,
        activityType: ActivityType.LIKE,
        contentType: ContentType.POST,
      };

      jest.spyOn(activityModel, 'findOne').mockResolvedValue(mockActivity as any);

      await expect(activityService.createActivity(createActivityDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getActivityById', () => {
    it('should return an activity by ID', async () => {
      jest.spyOn(activityModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockActivity),
      } as any);

      const result = await activityService.getActivityById(mockActivityId);
      expect(result).toEqual(mockActivity);
    });

    it('should throw NotFoundException when activity not found', async () => {
      jest.spyOn(activityModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(activityService.getActivityById(mockActivityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // Add more test cases for other methods
});
