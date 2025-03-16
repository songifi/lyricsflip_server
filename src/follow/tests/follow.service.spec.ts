// src/modules/follow/tests/follow.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FollowService } from '../follow.service';
import { Follow, FollowStatus } from '../../schemas/follow.schema';
import { User } from '../../schemas/user.schema';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';

// Mock data
const mockUser1 = { _id: 'user1Id', username: 'user1' };
const mockUser2 = { _id: 'user2Id', username: 'user2' };

const mockFollow = {
  _id: 'followId',
  followerId: mockUser1._id,
  followeeId: mockUser2._id,
  status: FollowStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
  toObject: jest.fn().mockReturnValue(this),
};

describe('FollowService', () => {
  let service: FollowService;
  let followModel: Model<Follow>;
  let userModel: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowService,
        {
          provide: getModelToken(Follow.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockFollow),
            constructor: jest.fn().mockResolvedValue(mockFollow),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            exists: jest.fn(),
            countDocuments: jest.fn(),
            deleteOne: jest.fn(),
            save: jest.fn(),
            exec: jest.fn(),
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

    service = module.get<FollowService>(FollowService);
    followModel = module.get<Model<Follow>>(getModelToken(Follow.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFollow', () => {
    it('should throw an error if a user tries to follow themselves', async () => {
      await expect(
        service.createFollow(mockUser1._id, { followeeId: mockUser1._id }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw an error if the followee does not exist', async () => {
      jest.spyOn(userModel, 'exists').mockResolvedValue(null);
      
      await expect(
        service.createFollow(mockUser1._id, { followeeId: 'nonExistentUserId' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw an error if the follow relationship already exists', async () => {
      jest.spyOn(userModel, 'exists').mockResolvedValue(true);
      jest.spyOn(followModel, 'findOne').mockResolvedValue(mockFollow as any);
      
      await expect(
        service.createFollow(mockUser1._id, { followeeId: mockUser2._id }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create a new follow relationship', async () => {
      jest.spyOn(userModel, 'exists').mockResolvedValue(true);
      jest.spyOn(followModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(followModel as any, 'save').mockResolvedValue(mockFollow);
      
      const result = await service.createFollow(mockUser1._id, { followeeId: mockUser2._id });
      
      expect(result).toEqual(mockFollow);
    });
  });

  describe('unfollow', () => {
    it('should throw an error if the follow relationship does not exist', async () => {
      jest.spyOn(followModel, 'deleteOne').mockResolvedValue({ deletedCount: 0 } as any);
      
      await expect(
        service.unfollow(mockUser1._id, mockUser2._id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete the follow relationship', async () => {
      jest.spyOn(followModel, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
      
      await service.unfollow(mockUser1._id, mockUser2._id);
      
      expect(followModel.deleteOne).toHaveBeenCalledWith({
        followerId: mockUser1._id,
        followeeId: mockUser2._id,
      });
    });
  });

  describe('isFollowing', () => {
    it('should return true if a follow relationship exists', async () => {
      jest.spyOn(followModel, 'findOne').mockResolvedValue(mockFollow as any);
      
      const result = await service.isFollowing(mockUser1._id, mockUser2._id);
      
      expect(result).toBe(true);
    });

    it('should return false if no follow relationship exists', async () => {
      jest.spyOn(followModel, 'findOne').mockResolvedValue(null);
      
      const result = await service.isFollowing(mockUser1._id, mockUser2._id);
      
      expect(result).toBe(false);
    });
  });

  // Additional tests for other methods would follow the same pattern
});