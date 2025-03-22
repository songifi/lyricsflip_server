// File: src/modules/comments/test/comment.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CommentService } from '../services/comment.service';
import { Comment, CommentDocument, CommentStatus, ContentType } from '../schemas/comment.schema';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('CommentService', () => {
  let service: CommentService;
  let commentModel: Model<CommentDocument>;

  const mockUserId = new Types.ObjectId().toString();
  const mockContentId = new Types.ObjectId().toString();
  const mockCommentId = new Types.ObjectId().toString();
  const mockParentId = new Types.ObjectId().toString();

  const mockComment = {
    _id: mockCommentId,
    userId: mockUserId,
    contentType: ContentType.SONG,
    contentId: mockContentId,
    parentId: null,
    text: 'Test comment',
    status: CommentStatus.ACTIVE,
    depth: 0,
    repliesCount: 0,
    likesCount: 0,
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  const mockReply = {
    _id: new Types.ObjectId().toString(),
    userId: mockUserId,
    contentType: ContentType.SONG,
    contentId: mockContentId,
    parentId: mockParentId,
    text: 'Test reply',
    status: CommentStatus.ACTIVE,
    depth: 1,
    repliesCount: 0,
    likesCount: 0,
    isEdited: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: getModelToken(Comment.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockComment),
            constructor: jest.fn().mockResolvedValue(mockComment),
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
            exec: jest.fn(),
            populate: jest.fn(),
            sort: jest.fn(),
            skip: jest.fn(),
            limit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommentService>(CommentService);
    commentModel = module.get<Model<CommentDocument>>(getModelToken(Comment.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a top-level comment successfully', async () => {
      const createCommentDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        text: 'Test comment',
      };

      jest.spyOn(mockComment, 'save').mockResolvedValue(mockComment);

      const result = await service.create(mockUserId, createCommentDto);
      expect(result).toEqual(mockComment);
      expect(result.depth).toBe(0);
    });

    it('should create a reply comment successfully', async () => {
      const createCommentDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        parentId: mockParentId,
        text: 'Test reply',
      };

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockComment,
          _id: mockParentId,
          depth: 0,
          repliesCount: 0,
        }),
      } as any);

      jest.spyOn(commentModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      } as any);

      jest.spyOn(mockReply, 'save').mockResolvedValue(mockReply);
      jest.spyOn(commentModel, 'new').mockReturnValue(mockReply as any);

      const result = await service.create(mockUserId, createCommentDto);
      expect(result.depth).toBe(1);
      expect(commentModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockParentId,
        { $inc: { repliesCount: 1 } }
      );
    });

    it('should throw NotFoundException if parent comment does not exist', async () => {
      const createCommentDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        parentId: mockParentId,
        text: 'Test reply',
      };

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(service.create(mockUserId, createCommentDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if parent comment is deleted', async () => {
      const createCommentDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        parentId: mockParentId,
        text: 'Test reply',
      };

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockComment,
          _id: mockParentId,
          status: CommentStatus.DELETED,
        }),
      } as any);

      await expect(service.create(mockUserId, createCommentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if max depth is exceeded', async () => {
      const createCommentDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        parentId: mockParentId,
        text: 'Test reply',
      };

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockComment,
          _id: mockParentId,
          depth: 5, // Max depth is 5
        }),
      } as any);

      await expect(service.create(mockUserId, createCommentDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByContent', () => {
    it('should return comments for content with pagination', async () => {
      const paginationQuery = {
        page: 1,
        limit: 10,
        status: CommentStatus.ACTIVE,
      };

      jest.spyOn(commentModel, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      } as any);

      jest.spyOn(commentModel, 'find').mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockComment]),
      } as any);

      const result = await service.findByContent(ContentType.SONG, mockContentId, paginationQuery);
      expect(result.comments).toEqual([mockComment]);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('update', () => {
    it('should update a comment successfully', async () => {
      const updateCommentDto = {
        text: 'Updated text',
      };

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockComment,
          userId: { toString: () => mockUserId },
          save: jest.fn().mockResolvedValue({
            ...mockComment,
            text: updateCommentDto.text,
            isEdited: true,
          }),
        }),
      } as any);

      const result = await service.update(mockCommentId, mockUserId, updateCommentDto);
      expect(result.text).toBe(updateCommentDto.text);
      expect(result.isEdited).toBe(true);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      const updateCommentDto = {
        text: 'Updated text',
      };

      const differentUserId = new Types.ObjectId().toString();

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockComment,
          userId: { toString: () => differentUserId },
        }),
      } as any);

      await expect(service.update(mockCommentId, mockUserId, updateCommentDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if comment is deleted', async () => {
      const updateCommentDto = {
        text: 'Updated text',
      };

      jest.spyOn(commentModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockComment,
          userId: { toString: () => mockUserId },
          status: CommentStatus.DELETED,
        }),
      } as any);

      await expect(service.update(mockCommentId, mockUserId, updateCommentDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // Add more test cases for other methods...
});