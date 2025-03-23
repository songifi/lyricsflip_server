import { IsString, IsEnum, IsBoolean, IsOptional, IsObject, IsNotEmpty, IsNumber, Min, Max, IsMongoId, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, ContentType } from './notification.schema';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID of the user to notify' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ 
    description: 'Type of notification', 
    enum: NotificationType,
    example: NotificationType.LIKE
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'ID of the user who triggered the notification' })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiProperty({ 
    description: 'Type of content related to the notification', 
    enum: ContentType,
    example: ContentType.POST
  })
  @IsEnum(ContentType)
  contentType: ContentType;

  @ApiProperty({ description: 'ID of the specific content' })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the notification' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateNotificationDto {
  @ApiPropertyOptional({ description: 'Whether the notification has been read' })
  @IsBoolean()
  @IsOptional()
  read?: boolean;

  @ApiPropertyOptional({ description: 'Additional metadata for the notification' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class NotificationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  read?: boolean;

  @ApiPropertyOptional({ description: 'Filter by content type', enum: ContentType })
  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @ApiPropertyOptional({ description: 'Filter by content ID' })
  @IsString()
  @IsOptional()
  contentId?: string;

  @ApiPropertyOptional({ description: 'Filter by actor ID' })
  @IsString()
  @IsOptional()
  actorId?: string;

  @ApiPropertyOptional({ description: 'Maximum number of notifications to return', default: 20 })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of notifications to skip (for pagination)', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  skip?: number = 0;

  @ApiPropertyOptional({ description: 'Sort order (asc or desc)', default: 'desc' })
  @IsString()
  @IsOptional()
  sort?: 'asc' | 'desc' = 'desc';
}

export class NotificationCountDto {
  @ApiProperty({ description: 'Total number of notifications' })
  total: number;
  
  @ApiProperty({ description: 'Number of unread notifications' })
  unread: number;
}

export class NotificationIdParam {
  @ApiProperty({ description: 'Notification ID' })
  @IsMongoId()
  id: string;
}

export class NotificationBulkReadDto {
  @ApiProperty({ description: 'Array of notification IDs to mark as read' })
  @IsMongoId({ each: true })
  ids: string[];
}
