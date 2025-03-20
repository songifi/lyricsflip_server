// src/modules/player/player.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';
import { PlayerService } from './player.service';
import { PlayerJoinDto } from './dto/player-join.dto';

interface AuthenticatedSocket extends Socket {
  user: {
    sub: string;  // User ID
    username: string;
  };
}

@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
  },
})
export class PlayerGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly playerService: PlayerService) {}

  // Handle new WebSocket connections
  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    // Authentication handled via middleware in module setup
    if (!client.user) {
      client.disconnect();
      return;
    }

    // Check if user is already in a session
    const activeSessionId = await this.playerService.checkActiveSession(client.user.sub);
    if (activeSessionId) {
      // Join the session room automatically for existing sessions
      client.join(`session:${activeSessionId}`);
    }
  }

  // Handle WebSocket disconnections
  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    // Handle player disconnection in service
    await this.playerService.handleDisconnection(client.id);
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; joinDto: PlayerJoinDto }
  ): Promise<any> {
    try {
      const { sessionId, joinDto } = data;
      
      // Join the session room for broadcasting
      client.join(`session:${sessionId}`);
      
      // Process join in service
      const player = await this.playerService.joinSession(
        client.user.sub,
        sessionId,
        joinDto,
        client.id
      );

      // Broadcast updated player list to all clients in the session
      const players = await this.playerService.getSessionPlayers(sessionId);
      this.server.to(`session:${sessionId}`).emit('playerList', players);

      return { 
        success: true, 
        player 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('leaveSession')
  async handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string }
  ): Promise<any> {
    try {
      const { sessionId } = data;
      
      // Process leave in service
      await this.playerService.leaveSession(client.user.sub, sessionId);
      
      // Leave the session room
      client.leave(`session:${sessionId}`);

      // Broadcast updated player list to all clients in the session
      const players = await this.playerService.getSessionPlayers(sessionId);
      this.server.to(`session:${sessionId}`).emit('playerList', players);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('setReady')
  async handleSetReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; isReady: boolean }
  ): Promise<any> {
    try {
      const { sessionId, isReady } = data;
      
      // Process ready status in service
      await this.playerService.setReady(client.user.sub, sessionId, isReady);

      // Broadcast updated player list to all clients in the session
      const players = await this.playerService.getSessionPlayers(sessionId);
      this.server.to(`session:${sessionId}`).emit('playerList', players);

      // Check if all players are ready
      const allReady = await this.playerService.areAllPlayersReady(sessionId);
      if (allReady) {
        this.server.to(`session:${sessionId}`).emit('allPlayersReady');
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('toggleSpectator')
  async handleToggleSpectator(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string }
  ): Promise<any> {
    try {
      const { sessionId } = data;
      
      // Process spectator toggle in service
      await this.playerService.toggleSpectator(client.user.sub, sessionId);

      // Broadcast updated player list to all clients in the session
      const players = await this.playerService.getSessionPlayers(sessionId);
      this.server.to(`session:${sessionId}`).emit('playerList', players);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('kickPlayer')
  async handleKickPlayer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string; playerToKickId: string }
  ): Promise<any> {
    try {
      const { sessionId, playerToKickId } = data;
      
      // Process kick in service
      await this.playerService.kickPlayer(client.user.sub, sessionId, playerToKickId);

      // Broadcast updated player list to all clients in the session
      const players = await this.playerService.getSessionPlayers(sessionId);
      this.server.to(`session:${sessionId}`).emit('playerList', players);

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Send a targeted event to specific player by userId
   */
  sendToPlayer(userId: string, event: string, data: any): void {
    // Find all sockets for this player
    const rooms = this.server.sockets.adapter.rooms;
    for (const [socketId, socket] of this.server.sockets.sockets.entries()) {
      const client = socket as AuthenticatedSocket;
      if (client.user && client.user.sub === userId) {
        client.emit(event, data);
        return;
      }
    }
  }

  /**
   * Send an event to all players in a session
   */
  sendToSession(sessionId: string, event: string, data: any): void {
    this.server.to(`session:${sessionId}`).emit(event, data);
  }
}
