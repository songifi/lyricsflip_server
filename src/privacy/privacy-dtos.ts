// src/privacy/dto/update-privacy-settings.dto.ts

import { IsEnum, IsBoolean, IsObject, IsOptional } from 'class-validator';
import { 
  ProfileVisibility, 
  ContentVisibility, 
  FollowApprovalMode 
} from '../entities/privacy-settings.entity';

export class UpdatePrivacySettingsDto {
  @IsEnum(ProfileVisibility)
  @IsOptional()
  profileVisibility?: ProfileVisibility;

  @IsEnum(ContentVisibility)
  @IsOptional()
  postVisibility?: ContentVisibility;

  @IsEnum(ContentVisibility)
  @IsOptional()
  messageVisibility?: ContentVisibility;

  @IsEnum(FollowApprovalMode)
  @IsOptional()
  followApprovalMode?: FollowApprovalMode;

  @IsBoolean()
  @IsOptional()
  showOnlineStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  showLastSeen?: boolean;

  @IsBoolean()
  @IsOptional()
  allowTagging?: boolean;

  @IsBoolean()
  @IsOptional()
  allowMentions?: boolean;

  @IsBoolean()
  @IsOptional()
  showInSearchResults?: boolean;

  @IsBoolean()
  @IsOptional()
  allowDirectMessages?: boolean;

  @IsBoolean()
  @IsOptional()
  blockScreenshots?: boolean;

  @IsObject()
  @IsOptional()
  customSettings?: Record<string, any>;
}

// src/privacy/dto/privacy-template.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';

export class ApplyPrivacyTemplateDto {
  @IsString()
  @IsNotEmpty()
  templateName: string;
}

// src/privacy/dto/follow-request.dto.ts

import { IsUUID } from 'class-validator';

export class CreateFollowRequestDto {
  @IsUUID()
  targetUserId: string;
}

export class RespondToFollowRequestDto {
  @IsUUID()
  requestId: string;
}
