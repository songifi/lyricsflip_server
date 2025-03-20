// src/modules/player/listeners/player-events.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PlayerEvents, PlayerJoinedEvent, PlayerLeftEvent, PlayerDisconnectedEvent, PlayerReadyChangedEvent } from '../player.events';
import { PlayerGateway } from '../player.gateway';

@Injectable()
export class PlayerEventsListener {
  private readonly logger = new Logger(PlayerEventsListener.name);

  constructor(private readonly playerGateway: PlayerGateway) {}

  @OnEvent(PlayerEvents.PLAYER_JOINED)
  handlePlayerJoined(event: PlayerJoinedEvent) {
    this.logger.log(`Player ${event.userId} joined session ${event.sessionId}`);
    
    // Broadcast to the session
    this.playerGateway.sendToSession(
      event.sessionId,
      'playerJoined',
      {
        playerId: event.playerId,
        userId: event.userId,
        isSpectator: event.isSpectator,
      }
    );
  }

  @OnEvent(PlayerEvents.PLAYER_LEFT)
  handlePlayerLeft(event: PlayerLeftEvent) {
    this.logger.log(`Player ${event.userId} left session ${event.sessionId}`);
    
    // Broadcast to the session
    this.playerGateway.sendToSession(
      event.sessionId,
      'playerLeft',
      {
        playerId: event.playerId,
        userId: event.userId,
      }
    );
  }

  @OnEvent(PlayerEvents.PLAYER_DISCONNECTED)
  handlePlayerDisconnected(event: PlayerDisconnectedEvent) {
    this.logger.log(`Player ${event.userId} disconnected from session ${event.sessionId}`);
    
    // Broadcast to the session
    this.playerGateway.sendToSession(
      event.sessionId,
      'playerDisconnected',
      {
        playerId: event.playerId,
        userId: event.userId,
      }
    );
  }

  @OnEvent(PlayerEvents.PLAYER_READY_CHANGED)
  handlePlayerReadyChanged(event: PlayerReadyChangedEvent) {
    this.logger.log(`Player ${event.userId} ready status changed to ${event.isReady} in session ${event.sessionId}`);
    
    // Broadcast to the session
    this.playerGateway.sendToSession(
      event.sessionId,
      'playerReadyChanged',
      {
        playerId: event.playerId,
        userId: event.userId,
        isReady: event.isReady,
      }
    );
  }

  @OnEvent(PlayerEvents.PLAYER_KICKED)
  handlePlayerKicked(event: PlayerDisconnectedEvent) {
    this.logger.log(`Player ${event.userId} was kicked from session ${event.sessionId}`);
    
    // Send direct notification to the kicked player
    this.playerGateway.sendToPlayer(
      event.userId,
      'youWereKicked',
      {
        sessionId: event.sessionId,
      }
    );
    
    // Broadcast to the session
    this.playerGateway.sendToSession(
      event.sessionId,
      'playerKicked',
      {
        playerId: event.playerId,
        userId: event.userId,
      }
    );
  }

  @OnEvent(PlayerEvents.SPECTATOR_CHANGED)
  handleSpectatorChanged(event: any) {
    this.logger.log(`Player ${event.userId} spectator status changed to ${event.isSpectator} in session ${event.sessionId}`);
    
    // Broadcast to the session
    this.playerGateway.sendToSession(
      event.sessionId,
      'spectatorStatusChanged',
      {
        playerId: event.playerId,
        userId: event.userId,
        isSpectator: event.isSpectator,
      }
    );
  }
}
