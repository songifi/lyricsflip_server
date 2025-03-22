// src/privacy/privacy.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { PrivacyService } from './privacy.service';
import { PrivacySettings, ProfileVisibility, ContentVisibility, FollowApprovalMode } from './entities/privacy-settings.entity';
import { FollowRequest, FollowRequestStatus } from './entities/follow-request.entity';
import { User } from '../user/entities/user.entity';

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

describe('PrivacyService', () => {
  let service: PrivacyService;
  let privacySettingsRepository: Repository<PrivacySettings>;
  let followRequestRepository: Repository<FollowRequest>;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyService,
        {
          provide: getRepositoryToken(PrivacySettings),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(FollowRequest),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<PrivacyService>(PrivacyService);
    privacySettingsRepository = module.get<Repository<PrivacySettings>>(
      getRepositoryToken(PrivacySettings),
    );
    followRequestRepository = module.get<Repository<FollowRequest>>(
      getRepositoryToken(FollowRequest),
    );
    userRepository = module.get<Repository<User>>(
      getRepositoryToken(User),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPrivacySettings', () => {
    it('should return cached settings if available', async () => {
      const userId = 'user-123';
      const cachedSettings = new PrivacySettings();
      mockCacheManager.get.mockResolvedValue(cachedSettings);

      const result = await service.getPrivacySettings(userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`privacy_settings:${userId}`);
      expect(result).toBe(cachedSettings);
    });

    it('should fetch settings from database if not cached', async () => {
      const userId = 'user-123';
      const dbSettings = new PrivacySettings();
      mockCacheManager.get.mockResolvedValue(null);
      jest.spyOn(privacySettingsRepository, 'findOne').mockResolvedValue(dbSettings);

      const result = await service.getPrivacySettings(userId);

      expect(mockCacheManager.get).toHaveBeenCalledWith(`privacy_settings:${userId}`);
      expect(privacySettingsRepository.findOne).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(`privacy_settings:${userId}`, dbSettings, 300);
      expect(result).toBe(dbSettings);
    });

    it('should create default settings if none exist', async () => {
      const userId = 'user-123';
      const user = new User();
      const defaultSettings = new PrivacySettings();
      
      mockCacheManager.get.mockResolvedValue(null);
      jest.spyOn(privacySettingsRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
      jest.spyOn(privacySettingsRepository, 'create').mockReturnValue(defaultSettings);
      jest.spyOn(privacySettingsRepository, 'save').mockResolvedValue(defaultSettings);

      const result = await service.getPrivacySettings(userId);

      expect(userRepository.findOne).toHaveBeenCalled();
      expect(privacySettingsRepository.create).toHaveBeenCalled();
      expect(privacySettingsRepository.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('privacy.settings.created', expect.any(Object));
      expect(result).toBe(defaultSettings);
    });
  });

  describe('updatePrivacySettings', () => {
    it('should update and save privacy settings', async () => {
      const userId = 'user-123';
      const existingSettings = new PrivacySettings();
      const updateDto = {
        profileVisibility: ProfileVisibility.PRIVATE,
        allowDirectMessages: false,
      };
      const updatedSettings = { ...existingSettings, ...updateDto };

      jest.spyOn(privacySettingsRepository, 'findOne').mockResolvedValue(existingSettings);
      jest.spyOn(privacySettingsRepository, 'save').mockResolvedValue(updatedSettings as PrivacySettings);

      const result = await service.updatePrivacySettings(userId, updateDto);

      expect(privacySettingsRepository.findOne).toHaveBeenCalled();
      expect(privacySettingsRepository.save).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledWith(`privacy_settings:${userId}`);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('privacy.settings.updated', expect.any(Object));
      expect(result).toEqual(updatedSettings);
    });
  });

  describe('canViewProfile', () => {
    it('should allow users to view their own profile', async () => {
      const userId = 'user-123';
      
      const result = await service.canViewProfile(userId, userId);
      
      expect(result).toBe(true);
    });

    it('should allow anyone to view public profiles', async () => {
      const viewerId = 'viewer-123';
      const profileUserId = 'profile-123';
      const settings = new PrivacySettings();
      settings.profileVisibility = ProfileVisibility.PUBLIC;
      
      jest.spyOn(service, 'getPrivacySettings').mockResolvedValue(settings);
      
      const result = await service.canViewProfile(viewerId, profileUserId);
      
      expect(service.getPrivacySettings).toHaveBeenCalledWith(profileUserId);
      expect(result).toBe(true);
    });

    it('should check follow status for FOLLOWERS_ONLY profiles', async () => {
      const viewerId = 'viewer-123';
      const profileUserId = 'profile-123';
      const settings = new PrivacySettings();
      settings.profileVisibility = ProfileVisibility.FOLLOWERS_ONLY;
      
      jest.spyOn(service, 'getPrivacySettings').mockResolvedValue(settings);
      jest.spyOn(service as any, 'isFollowing').mockResolvedValue(true);
      
      const result = await service.canViewProfile(viewerId, profileUserId);
      
      expect(service.getPrivacySettings).toHaveBeenCalledWith(profileUserId);
      expect((service as any).isFollowing).toHaveBeenCalledWith(viewerId, profileUserId);
      expect(result).toBe(true);
    });
  });

  describe('applyPrivacyTemplate', () => {
    it('should apply template settings to user privacy', async () => {
      const userId = 'user-123';
      const existingSettings = new PrivacySettings();
      const templateDto = { templateName: 'private' };
      
      jest.spyOn(privacySettingsRepository, 'findOne').mockResolvedValue(existingSettings);
      jest.spyOn(privacySettingsRepository, 'save').mockImplementation(settings => Promise.resolve(settings as PrivacySettings));
      
      const result = await service.applyPrivacyTemplate(userId, templateDto);
      
      expect(privacySettingsRepository.findOne).toHaveBeenCalled();
      expect(privacySettingsRepository.save).toHaveBeenCalled();
      expect(mockCacheManager.del).toHaveBeenCalledWith(`privacy_settings:${userId}`);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('privacy.template.applied', expect.any(Object));
      expect(result.profileVisibility).toBe(ProfileVisibility.PRIVATE);
    });
  });

  // Additional tests would follow for other methods like:
  // - createFollowRequest
  // - approveFollowRequest
  // - rejectFollowRequest
  // - canViewContent
  // - canSendDirectMessage
  // - applyPostPrivacyFilters
  // etc.
});
