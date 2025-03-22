// File: src/modules/comments/test/comment.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from '../controllers/comment.controller';
import { CommentService } from '../services/comment.service';
import { CommentStatus, ContentType } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dto/create-comment.dto';

describe('CommentController', () => {
  let controller: CommentController;
  let service: CommentService;

  const mockUserId = 'user123';
  const mockContentId = 'content123';
  const mockCommentId = 'comment123';

  const mockComment = {
    _id: mockCommentId,
    userId: { _id: mockUserId, name: 'Test User' },
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [
        {
          provide: CommentService,
          useValue: {
            create: jest.fn(),
            findByContent: jest.fn(),
            findReplies: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            findByUser: jest.fn(),
            getContentStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CommentController>(CommentController);
    service = module.get<CommentService>(CommentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a comment', async () => {
      const createCommentDto: CreateCommentDto = {
        contentType: ContentType.SONG,
        contentId: mockContentId,
        text: 'Test comment',
      };

      jest.spyOn(service, 'create').mockResolvedValue(mockComment as any);

      const result = await controller.create(mockUserId, createCommentDto);
      expect(service.create).toHaveBeenCalledWith(mockUserId, createCommentDto);
      expect(result.id).toBe(mockCommentId);
    });
  });

  describe('findByContent', () => {
    it('should get comments for content', async () => {
      const mockResponse = {
        comments: [mockComment],
        total: 1,
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, 'findByContent').mockResolvedValue(mockResponse as any);

      const result = await controller.findByContent(
        ContentType.SONG,
        mockContentId,
        { page: 1, limit: 10 }
      );

      expect(service.findByContent).toHaveBeenCalledWith(
        ContentType.SONG,
        mockContentId,
        { page: 1, limit: 10 }
      );
      expect(result.comments.length).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  // Add more test cases for other controller methods...
});
