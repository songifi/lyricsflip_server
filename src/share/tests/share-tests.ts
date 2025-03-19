// src/modules/share/tests/share.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
// import { ShareService } from '../share.service';
import { Share, ContentType, TargetType } from '../schemas/share.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { User } from 'src/schemas/user.schema';

// Mock data
const mockUserId = new Types.ObjectId().toString();
const mockContentId = new Types.ObjectId().toString();
const mockTargetId = new Types.ObjectId().toString();

const mockShare = {
  _id: new Types.ObjectId().toString(),
  userId: mockUserId,
  contentType: ContentType.SONG,
  contentId: mockContentId,
  targetType: TargetType.INTERNAL,
  targetId: mockTargetId,
  message: 'Check out this song!',
  createdAt: new Date(),
  toObject: jest.fn().mockReturnThis(),
};

describe('ShareService', () => {
  let service: ShareService;
  let shareModel: Model<Share>;
  let userModel: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShareService,
        {
          provide: getModelToken(Share.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockShare),
            constructor: jest.fn().mockResolvedValue(mockShare),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndDelete: jest.fn(),
            exists: jest.fn(),
            countDocuments: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
            aggregate: jest.fn(),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            exists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ShareService>(ShareService);
    shareModel = module.get<Model<Share>>(getModelToken(Share.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new share', async () => {
      // Setup mocks
      jest.spyOn(userModel, 'exists').mockResolvedValue(true);
      jest.spyOn(shareModel.prototype, 'save').mockResolvedValue(mockShare as any);

      // Test
      const createShareDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        targetType: TargetType.INTERNAL,
        targetId: mockTargetId,
        message: 'Check out this song!',
      };

      const result = await service.create(mockUserId, createShareDto);

      // Assertions
      expect(result).toEqual(mockShare);
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      // Setup mocks
      jest.spyOn(userModel, 'exists').mockResolvedValue(false);

      // Test
      const createShareDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        targetType: TargetType.INTERNAL,
        targetId: mockTargetId,
        message: 'Check out this song!',
      };

      // Assertions
      await expect(service.create(mockUserId, createShareDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a share by id', async () => {
      // Setup mocks
      jest.spyOn(shareModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockShare),
        }),
      } as any);

      // Test
      const result = await service.findOne(mockShare._id);

      // Assertions
      expect(result).toEqual(mockShare);
    });

    it('should throw NotFoundException if share does not exist', async () => {
      // Setup mocks
      jest.spyOn(shareModel, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      } as any);

      // Assertions
      await expect(service.findOne(mockShare._id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if id is invalid', async () => {
      // Assertions
      await expect(service.findOne('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a share', async () => {
      // Setup mocks
      jest.spyOn(shareModel, 'findById').mockResolvedValue({
        ...mockShare,
        userId: {
          toString: () => mockUserId,
        },
      } as any);
      jest.spyOn(shareModel, 'findByIdAndDelete').mockResolvedValue(mockShare as any);

      // Test
      await service.remove(mockShare._id, mockUserId);

      // Assertions
      expect(shareModel.findByIdAndDelete).toHaveBeenCalledWith(mockShare._id);
    });

    it('should throw NotFoundException if share does not exist', async () => {
      // Setup mocks
      jest.spyOn(shareModel, 'findById').mockResolvedValue(null);

      // Assertions
      await expect(service.remove(mockShare._id, mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user does not have permission', async () => {
      // Setup mocks
      jest.spyOn(shareModel, 'findById').mockResolvedValue({
        ...mockShare,
        userId: {
          toString: () => 'different-user-id',
        },
      } as any);

      // Assertions
      await expect(service.remove(mockShare._id, mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  // Additional tests would follow the same pattern
});
