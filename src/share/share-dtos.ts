// src/shares/dto/share.dto.ts

import { IsString, IsOptional, IsEnum, IsUUID, IsDate, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SharePlatform, ShareVisibility } from '../share.constants';

export class CreateShareDto {
  @IsUUID()
  contentId: string;

  @IsEnum(SharePlatform)
  @IsOptional()
  platform?: SharePlatform;

  @IsEnum(ShareVisibility)
  @IsOptional()
  visibility?: ShareVisibility;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;

  @IsBoolean()
  @IsOptional()
  generatePreview?: boolean;
}

export class ShareDto {
  @IsUUID()
  id: string;

  @IsUUID()
  contentId: string;

  @IsUUID()
  userId: string;

  @IsEnum(SharePlatform)
  platform: SharePlatform;

  @IsEnum(ShareVisibility)
  visibility: ShareVisibility;

  @IsString()
  shareLink: string;

  @IsString()
  @IsOptional()
  previewUrl?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @IsOptional()
  expiresAt?: Date;

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;
}

export class ShareFilterDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsUUID()
  @IsOptional()
  contentId?: string;

  @IsEnum(SharePlatform)
  @IsOptional()
  platform?: SharePlatform;

  @IsEnum(ShareVisibility)
  @IsOptional()
  visibility?: ShareVisibility;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  toDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset?: number;
}

export class ShareAnalyticsDto {
  @IsUUID()
  shareId: string;

  @IsNumber()
  viewCount: number;

  @IsNumber()
  clickCount: number;

  @IsNumber()
  uniqueViewers: number;

  @IsNumber()
  conversionRate: number;

  @IsOptional()
  geoDistribution: Record<string, number>;

  @IsOptional()
  referrers: Record<string, number>;
}

export class GenerateEmbedDto {
  @IsUUID()
  shareId: string;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsBoolean()
  @IsOptional()
  autoplay?: boolean;
}

// src/shares/share.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';
import { Share } from './entities/share.entity';
import { ShareView } from './entities/share-view.entity';
import { ContentModule } from '../content/content.module';
import { UserModule } from '../users/user.module';
import { NotificationModule } from '../notifications/notification.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Share, ShareView]),
    ContentModule,
    UserModule,
    NotificationModule,
    AnalyticsModule,
    CommonModule,
  ],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
