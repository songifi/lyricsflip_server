import { IsString, IsEnum, IsUUID, IsBoolean, IsOptional, IsObject, IsArray, IsInt, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, NotificationChannel, NotificationStatus } from './notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Type of notification', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ description: 'ID of the actor who triggered the notification' })
  @IsUUID()
  @IsOptional()
  actorId?: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification body' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiPropertyOptional({ description: 'Metadata for the notification' })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Delivery channel', enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel = NotificationChannel.IN_APP;
}

export class CreateNotificationFromTemplateDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Type of notification', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({ description: 'ID of the actor who triggered the notification' })
  @IsUUID()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Template variables' })
  @IsObject()
  @IsOptional()
  variables?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiPropertyOptional({ description: 'Metadata for the notification' })
  @IsObject()
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ description: 'Delivery channel', enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  @IsOptional()
  channel?: NotificationChannel = NotificationChannel.IN_APP;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Whether the notification is read' })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional({ description: 'Notification status', enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsObject()
  @IsOptional()
  data?: any;

  @ApiPropertyOptional({ description: 'Metadata for the notification' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional({ description: 'Filter by notification status', enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsUUID()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Number of items to return per page', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Page number (zero-based)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  page?: number = 0;

  @ApiPropertyOptional({ description: 'Start date for filtering notifications' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for filtering notifications' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class MarkReadDto {
  @ApiProperty({ description: 'IDs of notifications to mark as read' })
  @IsUUID(undefined, { each: true })
  ids: string[];
}

export class NotificationPreferenceDto {
  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Whether this notification type is enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Enabled delivery channels' })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabledChannels: NotificationChannel[];

  @ApiPropertyOptional({ description: 'Quiet hours start time (HH:MM format)' })
  @IsString()
  @IsOptional()
  quietHoursStart?: string;

  @ApiPropertyOptional({ description: 'Quiet hours end time (HH:MM format)' })
  @IsString()
  @IsOptional()
  quietHoursEnd?: string;

  @ApiPropertyOptional({ description: 'Whether to include in email digest' })
  @IsBoolean()
  @IsOptional()
  emailDigest?: boolean;

  @ApiPropertyOptional({ description: 'Digest frequency' })
  @IsString()
  @IsOptional()
  digestFrequency?: 'daily' | 'weekly' | 'never';
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ description: 'Notification preferences' })
  @IsArray()
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];
}

export class NotificationCountsDto {
  @ApiProperty({ description: 'Total number of notifications' })
  total: number;

  @ApiProperty({ description: 'Number of unread notifications' })
  unread: number;
}

export class NotificationTemplateDto {
  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification channel', enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiProperty({ description: 'Title template' })
  @IsString()
  titleTemplate: string;

  @ApiProperty({ description: 'Body template' })
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional({ description: 'Data template' })
  @IsObject()
  @IsOptional()
  dataTemplate?: any;

  @ApiPropertyOptional({ description: 'Whether this template is active' })
  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @ApiPropertyOptional({ description: 'Metadata for the template' })
  @IsObject()
  @IsOptional()
  metadata?: any;
}
