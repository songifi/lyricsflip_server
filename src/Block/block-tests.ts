// src/modules/block/tests/block.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BlockService } from '../block.service';
import { Block } from '../schemas/block.schema';
import { User } from '../../user/schemas/user.schema';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

// Mock data
const mockBlockerId = new Types.ObjectId().toString();
const mockBlockedId = new Types.ObjectId().toString();

const mockBlock = {
  _id: new Types.ObjectId().toString(),
  blockerId: mockBlockerId,
  blockedId: mockBlockedId,
  reason: 'Test reason',
  createdAt: new Date(),
  toObject: jest.fn().mockReturnThis(),
};

describe('BlockService', () => {
  let service: BlockService;
  let blockModel: Model<Block>;
  let userModel: Model<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockService,
        {
          provide: getModelToken(Block.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockBlock),
            constructor: jest.fn().mockResolvedValue(mockBlock),
            find: jest.fn(),
            findOne: jest.fn(),
            deleteOne: jest.fn(),
            countDocuments: jest.fn(),
            create: jest.fn(),
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

    service = module.get<BlockService>(BlockService);
    blockModel = module.get<Model<Block>>(getModelToken(Block.name));
    userModel = module.get<Model<User>>(getModelToken(User.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blockUser', () => {
    it('should throw BadRequestException if user tries to block themselves', async () => {
      const createBlockDto = { blockedId: mockBlockerId, reason: 'Test reason' };
      
      await expect(service.blockUser(mockBlockerId, createBlockDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if blocked user does not exist', async () => {
      jest.spyOn(userModel, 'exists').mockResolvedValue(null);
      
      const createBlockDto = { blockedId: mockBlockedId, reason: 'Test reason' };
      
      await expect(service.blockUser(mockBlockerId, createBlockDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if block already exists', async () => {
      jest.spyOn(userModel, 'exists').mockResolvedValue(true);
      jest.spyOn(blockModel, 'findOne').mockResolvedValue(mockBlock as any);
      
      const createBlockDto = { blockedId: mockBlockedId, reason: 'Test reason' };
      
      await expect(service.blockUser(mockBlockerId, createBlockDto))
        .rejects.toThrow(ConflictException);
    });

    it('should create a new block relationship', async () => {
      jest.spyOn(userModel, 'exists').mockResolvedValue(true);
      jest.spyOn(blockModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(blockModel.prototype, 'save').mockResolvedValue(mockBlock as any);
      
      const createBlockDto = { blockedId: mockBlockedId, reason: 'Test reason' };
      const result = await service.blockUser(mockBlockerId, createBlockDto);
      
      expect(result).toEqual(mockBlock);
    });
  });

  describe('unblockUser', () => {
    it('should throw NotFoundException if block does not exist', async () => {
      jest.spyOn(blockModel, 'deleteOne').mockResolvedValue({ deletedCount: 0 } as any);
      
      await expect(service.unblockUser(mockBlockerId, mockBlockedId))
        .rejects.toThrow(NotFoundException);
    });

    it('should delete the block relationship', async () => {
      jest.spyOn(blockModel, 'deleteOne').mockResolvedValue({ deletedCount: 1 } as any);
      
      await service.unblockUser(mockBlockerId, mockBlockedId);
      
      expect(blockModel.deleteOne).toHaveBeenCalledWith({
        blockerId: mockBlockerId,
        blockedId: mockBlockedId,
      });
    });
  });

  describe('isUserBlocked', () => {
    it('should return true if user is blocked', async () => {
      jest.spyOn(blockModel, 'findOne').mockResolvedValue(mockBlock as any);
      
      const result = await service.isUserBlocked(mockBlockerId, mockBlockedId);
      
      expect(result).toBe(true);
    });

    it('should return false if user is not blocked', async () => {
      jest.spyOn(blockModel, 'findOne').mockResolvedValue(null);
      
      const result = await service.isUserBlocked(mockBlockerId, mockBlockedId);
      
      expect(result).toBe(false);
    });
  });

  describe('isBlockedBy', () => {
    it('should return true if user is blocked by other user', async () => {
      jest.spyOn(blockModel, 'findOne').mockResolvedValue(mockBlock as any);
      
      const result = await service.isBlockedBy(mockBlockedId, mockBlockerId);
      
      expect(result).toBe(true);
    });

    it('should return false if user is not blocked by other user', async () => {
      jest.spyOn(blockModel, 'findOne').mockResolvedValue(null);
      
      const result = await service.isBlockedBy(mockBlockedId, mockBlockerId);
      
      expect(result).toBe(false);
    });
  });

  // Additional tests for other methods would follow the same pattern
});
