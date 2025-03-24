import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Notification } from './notification.entity';
import { NotificationService } from './notification.service';
import { MarkReadDto } from './notification.dto';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { User } from '../user/user.entity';
import { RateLimiterService } from '../common/services/rate-limiter.service';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*', // Configure as needed
  }
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(NotificationGateway.name);
  
  // Map to track connected clients by userId and socketId
  private connectedClients = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly notificationService: NotificationService,
    private readonly rateLimiterService: RateLimiterService
  ) {}

  /**
   * Handle new WebSocket connections
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // Extract token from handshake
      const token = client.handshake.auth.token || 
        client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn('Client attempted to connect without a token');
        client.disconnect();
        return;
      }
      
      // Verify the token
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub || decoded.userId;
      
      if (!userId) {
        this.logger.warn('Invalid token: no user ID found');
        client.disconnect();
        return;
      }
      
      // Apply rate limiting (max 10 connections per minute per user)
      const rateLimitKey = `ws:connect:${userId}`;
      const isRateLimited = await this.rateLimiterService.isRateLimited(rateLimitKey, 10, 60);
      
      if (isRateLimited) {
        this.logger.warn(`Connection rate limit exceeded for user ${userId}`);
        client.disconnect();
        return;
      }
      
      // Increment rate limit counter
      await this.rateLimiterService.increment(rateLimitKey, 1, 60);
      
      // Store user ID on socket
      client.data.userId = userId;
      
      // Add to connected clients map
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      this.connectedClients.get(userId).add(client.id);
      
      // Join user-specific room
      client.join(`user:${userId}`);
      
      // Get unread count and send to client
      const counts = await this.notificationService.getNotificationCounts(userId);
      client.emit('unreadCount', counts.unread);
      
      this.logger.log(`Client connected: ${client.id} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error in handleConnection: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnections
   */
  handleDisconnect(client: Socket): void {
    try {
      const userId = client.data.userId;
      
      if (userId) {
        // Remove from connected clients map
        const userSockets = this.connectedClients.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          
          if (userSockets.size === 0) {
            this.connectedClients.delete(userId);
          }
        }
        
        this.logger.log(`Client disconnected: ${client.id} for user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Error in handleDisconnect: ${error.message}`, error.stack);
    }
  }

  /**
   * Subscribe to notifications
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribeToNotifications')
  handleSubscribe(
    @ConnectedSocket() client: Socket
  ): WsResponse<boolean> {
    // Client is already subscribed via the room mechanism
    return { event: 'subscribed', data: true };
  }

  /**
   * Mark notification as read
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string }
  ): Promise<WsResponse<boolean>> {
    try {
      const userId = client.data.userId;
      
      // Apply rate limiting (max 30 operations per minute)
      const rateLimitKey = `ws:markAsRead:${userId}`;
      const isRateLimited = await this.rateLimiterService.isRateLimited(rateLimitKey, 30, 60);
      
      if (isRateLimited) {
        return { event: 'error', data: false };
      }
      
      // Increment rate limit counter
      await this.rateLimiterService.increment(rateLimitKey, 1, 60);
      
      // Mark as read
      await this.notificationService.markAsRead(data.id, userId);
      
      // Get updated count
      const counts = await this.notificationService.getNotificationCounts(userId);
      
      // Send updated count to all user's connected clients
      this.server.to(`user:${userId}`).emit('unreadCount', counts.unread);
      
      return { event: 'markedAsRead', data: true };
    } catch (error) {
      this.logger.error(`Error in handleMarkAsRead: ${error.message}`, error.stack);
      return { event: 'error', data: false };
    }
  }

  /**
   * Mark multiple notifications as read
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markMultipleAsRead')
  async handleMarkMultipleAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: MarkReadDto
  ): Promise<WsResponse<boolean>> {
    try {
      const userId = client.data.userId;
      
      // Apply rate limiting (max 10 bulk operations per minute)
      const rateLimitKey = `ws:markMultipleAsRead:${userId}`;
      const isRateLimited = await this.rateLimiterService.isRateLimited(rateLimitKey, 10, 60);
      
      if (isRateLimited) {
        return { event: 'error', data: false };
      }
      
      // Increment rate limit counter
      await this.rateLimiterService.increment(rateLimitKey, 1, 60);
      
      // Mark as read
      await this.notificationService.markMultipleAsRead(data, userId);
      
      // Get updated count
      const counts = await this.notificationService.getNotificationCounts(userId);
      
      // Send updated count to all user's connected clients
      this.server.to(`user:${userId}`).emit('unreadCount', counts.unread);
      
      return { event: 'markedMultipleAsRead', data: true };
    } catch (error) {
      this.logger.error(`Error in handleMarkMultipleAsRead: ${error.message}`, error.stack);
      return { event: 'error', data: false };
    }
  }

  /**
   * Mark all notifications as read
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('markAllAsRead')
  async handleMarkAllAsRead(
    @ConnectedSocket() client: Socket
  ): Promise<WsResponse<boolean>> {
    try {
      const userId = client.data.userId;
      
      // Apply rate limiting (max 5 operations per minute)
      const rateLimitKey = `ws:markAllAsRead:${userId}`;
      const isRateLimited = await this.rateLimiterService.isRateLimited(rateLimitKey, 5, 60);
      
      if (isRateLimited) {
        return { event: 'error', data: false };
      }
      
      // Increment rate limit counter
      await this.rateLimiterService.increment(rateLimitKey, 1, 60);
      
      // Mark all as read
      await this.notificationService.markAllAsRead(userId);
      
      // Send updated count to all user's connected clients
      this.server.to(`user:${userId}`).emit('unreadCount', 0);
      
      return { event: 'markedAllAsRead', data: true };
    } catch (error) {
      this.logger.error(`Error in handleMarkAllAsRead: ${error.message}`, error.stack);
      return { event: 'error', data: false };
    }
  }

  /**
   * Check if a user is online (has active connections)
   */
  isUserOnline(userId: string): boolean {
    const userSockets = this.connectedClients.get(userId);
    return !!userSockets && userSockets.size > 0;
  }

  /**
   * Send a notification to a user
   */
  sendNotification(notification: Notification): void {
    try {
      if (!notification || !notification.userId) {
        return;
      }
      
      // Check if user is online
      if (this.isUserOnline(notification.userId)) {
        // Send to all user's connected clients
        this.server.to(`user:${notification.userId}`).emit('notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          actorId: notification.actorId,
          createdAt: notification.createdAt
        });
        
        // Also update unread count
        this.notificationService.getNotificationCounts(notification.userId)
          .then(counts => {
            this.server.to(`user:${notification.userId}`).emit('unreadCount', counts.unread);
          })
          .catch(error => {
            this.logger.error(`Error getting unread count: ${error.message}`, error.stack);
          });
      }
    } catch (error) {
      this.logger.error(`Error in sendNotification: ${error.message}`, error.stack);
    }
  }

  /**
   * Broadcast a notification to multiple users
   */
  broadcastNotification(
    userIds: string[],
    notificationData: Partial<Notification>
  ): void {
    try {
      for (const userId of userIds) {
        if (this.isUserOnline(userId)) {
          this.server.to(`user:${userId}`).emit('notification', {
            ...notificationData,
            broadcastId: Math.random().toString(36).substring(2, 15)
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error in broadcastNotification: ${error.message}`, error.stack);
    }
  }
}
