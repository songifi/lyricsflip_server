// src/comments/comment.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { CommentReport } from './entities/comment-report.entity';
import { ContentModule } from '../content/content.module';
import { UserModule } from '../users/user.module';
import { NotificationModule } from '../notifications/notification.module';
import { ModerationModule } from '../moderation/moderation.module';
import { CommonModule } from '../common/common.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, CommentLike, CommentReport]),
    ContentModule,
    UserModule,
    NotificationModule,
    ModerationModule,
    CommonModule,
    EventEmitterModule.forRoot()
  ],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService]
})
export class CommentModule {}

// src/moderation/moderation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as axios from 'axios';

interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  
  constructor(private readonly configService: ConfigService) {}
  
  /**
   * Moderate text content for inappropriate content
   */
  async moderateText(text: string): Promise<ModerationResult> {
    try {
      // Check if text is empty or too short
      if (!text || text.trim().length < 3) {
        return { flagged: false, categories: {}, scores: {} };
      }
      
      // Get moderation API key
      const apiKey = this.configService.get<string>('MODERATION_API_KEY');
      if (!apiKey) {
        this.logger.warn('Moderation API key not configured, skipping moderation check');
        return { flagged: false, categories: {}, scores: {} };
      }
      
      // Call content moderation API
      const response = await axios.default.post(
        'https://api.moderationtool.com/v1/moderate', // Example API endpoint
        {
          text,
          languages: ['en'],
          categories: ['harassment', 'hate', 'self_harm', 'sexual', 'violence']
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Process response
      const result = response.data;
      
      return {
        flagged: result.flagged,
        categories: result.categories,
        scores: result.category_scores
      };
    } catch (error) {
      // Log error but don't fail the operation
      this.logger.error(`Error moderating content: ${error.message}`, error.stack);
      
      // Default to not flagged if the moderation service fails
      return { flagged: false, categories: {}, scores: {} };
    }
  }
}

// src/moderation/moderation.module.ts

import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ModerationService],
  exports: [ModerationService]
})
export class ModerationModule {}

// src/comments/listeners/comment.listeners.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CommentEvents } from '../comment.constants';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
@Injectable()
export class CommentEventListeners {
  @WebSocketServer()
  server: Server;

  @OnEvent(CommentEvents.CREATED)
  handleCommentCreated(payload: any) {
    // Emit a WebSocket event to notify clients
    this.server.to(`content:${payload.contentId}`).emit('comment:created', {
      commentId: payload.commentId,
      contentId: payload.contentId,
      parentId: payload.parentId
    });
    
    // Room for the content author
    if (payload.contentAuthorId) {
      this.server.to(`user:${payload.contentAuthorId}`).emit('activity:comment:created', {
        commentId: payload.commentId,
        contentId: payload.contentId
      });
    }
    
    // Room for the parent comment author (if this is a reply)
    if (payload.parentAuthorId && payload.parentAuthorId !== payload.userId) {
      this.server.to(`user:${payload.parentAuthorId}`).emit('activity:comment:reply', {
        commentId: payload.commentId,
        parentId: payload.parentId
      });
    }
  }

  @OnEvent(CommentEvents.UPDATED)
  handleCommentUpdated(payload: any) {
    this.server.to(`content:${payload.contentId}`).emit('comment:updated', {
      commentId: payload.commentId,
      contentId: payload.contentId
    });
  }

  @OnEvent(CommentEvents.DELETED)
  handleCommentDeleted(payload: any) {
    this.server.to(`content:${payload.contentId}`).emit('comment:deleted', {
      commentId: payload.commentId,
      contentId: payload.contentId,
      moderatorAction: payload.moderatorAction
    });
  }

  @OnEvent(CommentEvents.LIKED)
  handleCommentLiked(payload: any) {
    // Only update the specific comment likes
    this.server.to(`comment:${payload.commentId}`).emit('comment:liked', {
      commentId: payload.commentId,
      likesCount: payload.likesCount
    });
    
    // Notify comment author of the like
    if (payload.commentAuthorId && payload.commentAuthorId !== payload.userId) {
      this.server.to(`user:${payload.commentAuthorI