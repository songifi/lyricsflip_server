import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsResponse,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { NotificationService } from './notification.service';
import { NotificationType, ContentType } from './notification.schema';

interface NotificationPayload {
  id?: string;
  type: NotificationType;
  title: string;
  body: string;
  contentType: ContentType;
  contentId?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure as needed for your environment
  },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected clients by userId
  private connectedClients: Map<string, Set<string>> = new Map();

  constructor(private readonly notificationService: NotificationService) {}

  async handleConnection(client: Socket) {
    try {
      // Authenticate connection
      const token = client.handshake.auth.token || client.handshake.headers.authorization;
      
      if (!token) {
        client.disconnect();
        return;
      }
      
      // Verify token and get userId - In a real app, use the WsJwtGuard
      // This is a simplified example for demonstration
      const userId = this.getUserIdFromToken(token);
      
      if (!userId) {
        client.disconnect();
        return;
      }
      
      // Store client connection
      client.data.userId = userId;
      
      // Add to connected clients map
      if (!this.connectedClients.has(userId)) {
        this.connectedClients.set(userId, new Set());
      }
      
      this.connectedClients.get(userId).add(client.id);
      
      // Join room for user-specific notifications
      client.join(`user:${userId}`);
      
      // Send unread notification count to client
      const counts = await this.notificationService.countNotifications(userId);
      client.emit('unread_count', counts.unread);
      
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    
    if (userId) {
      // Remove from connected clients map
      const userConnections = this.connectedClients.get(userId);
      
      if (userConnections) {
        userConnections.delete(client.id);
        
        if (userConnections.size === 0) {
          this.connectedClients.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('subscribe_notifications')
  @UseGuards(WsJwtGuard)
  handleSubscribe(client: Socket): WsResponse<boolean> {
    const userId = client.data.userId;
    
    if (!userId) {
      return { event: 'subscription_error', data: false };
    }
    
    // Already joined the room during connection,
    // but we could add additional room subscriptions here if needed
    
    return { event: 'subscription_success', data: true };
  }

  @SubscribeMessage('mark_read')
  @UseGuards(WsJwtGuard)
  async handleMarkAsRead(client: Socket, payload: { id: string }): Promise<WsResponse<boolean>> {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        return { event: 'mark_read_error', data: false };
      }
      
      // Get notification to verify ownership
      const notification = await this.notificationService.findOne(payload.id);
      
      if (notification.userId !== userId) {
        return { event: 'mark_read_error', data: false };
      }
      
      // Mark as read
      await this.notificationService.markAsRead(payload.id);
      
      // Get updated unread count
      const counts = await this.notificationService.countNotifications(userId);
      
      // Emit updated count to user
      this.server.to(`user:${userId}`).emit('unread_count', counts.unread);
      
      return { event: 'mark_read_success', data: true };
    } catch (error) {
      return { event: 'mark_read_error', data: false };
    }
  }

  @SubscribeMessage('mark_all_read')
  @UseGuards(WsJwtGuard)
  async handleMarkAllAsRead(client: Socket): Promise<WsResponse<boolean>> {
    try {
      const userId = client.data.userId;
      
      if (!userId) {
        return { event: 'mark_all_read_error', data: false };
      }
      
      // Mark all as read
      await this.notificationService.markAllAsRead(userId);
      
      // Emit updated count to user
      this.server.to(`user:${userId}`).emit('unread_count', 0);
      
      return { event: 'mark_all_read_success', data: true };
    } catch (error) {
      return { event: 'mark_all_read_error', data: false };
    }
  }

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(
    userId: string, 
    notification: NotificationPayload
  ): void {
    this.server.to(`user:${userId}`).emit('notification', notification);
    
    // Also update unread count
    this.notificationService.countNotifications(userId)
      .then(counts => {
        this.server.to(`user:${userId}`).emit('unread_count', counts.unread);
      })
      .catch(error => {
        console.error('Error getting notification counts:', error);
      });
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedClients.has(userId) && this.connectedClients.get(userId).size > 0;
  }

  /**
   * Get total number of connected clients
   */
  getConnectedClientsCount(): number {
    return Array.from(this.connectedClients.values())
      .reduce((total, clients) => total + clients.size, 0);
  }

  /**
   * Get number of online users
   */
  getOnlineUsersCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Helper method to extract userId from token
   * In a real app, use a proper JWT verification service
   */
  private getUserIdFromToken(token: string): string | null {
    try {
      // This is just a placeholder. In a real app, you'd verify the JWT
      // and extract the userId from it.
      // For example: return jwtService.verify(token.replace('Bearer ', '')).sub;
      
      // Mocked implementation for example purposes:
      if (!token) return null;
      const cleanToken = token.replace('Bearer ', '');
      
      // Very simplified example - not for production use
      // In reality, you'd decode and verify the JWT properly
      if (cleanToken.includes('.')) {
        const payload = cleanToken.split('.')[1];
        const decoded = Buffer.from(payload, 'base64').toString();
        const parsed = JSON.parse(decoded);
        return parsed.sub || parsed.userId || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting userId from token:', error);
      return null;
    }
  }
}
