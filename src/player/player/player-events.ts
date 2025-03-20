// src/modules/player/player.events.ts
export enum PlayerEvents {
  PLAYER_JOINED = 'player.joined',
  PLAYER_REJOINED = 'player.rejoined',
  PLAYER_LEFT = 'player.left',
  PLAYER_READY_CHANGED = 'player.ready_changed',
  PLAYER_DISCONNECTED = 'player.disconnected',
  PLAYER_KICKED = 'player.kicked',
  SPECTATOR_CHANGED = 'player.spectator_changed',
  PLAYERS_STATUS_UPDATED = 'players.status_updated',
}

// Player joined event
export interface PlayerJoinedEvent {
  playerId: string;
  sessionId: string;
  userId: string;
  isSpectator: boolean;
}

// Player rejoined event
export interface PlayerRejoinedEvent {
  playerId: string;
  sessionId: string;
  userId: string;
  isSpectator: boolean;
}

// Player left event
export interface PlayerLeftEvent {
  playerId: string;
  sessionId: string;
  userId: string;
}

// Player ready changed event
export interface PlayerReadyChangedEvent {
  playerId: string;
  sessionId: string;
  userId: string;
  isReady: boolean;
}

// Player disconnected event
export interface PlayerDisconnectedEvent {
  playerId: string;
  sessionId: string;
  userId: string;
}

// Player kicked event
export interface PlayerKickedEvent {
  playerId: string;
  sessionId: string;
  userId: string;
  kickedBy: string;
}

// Spectator changed event
export interface SpectatorChangedEvent {
  playerId: string;
  sessionId: string;
  userId: string;
  isSpectator: boolean;
}

// Players status updated event
export interface PlayersStatusUpdatedEvent {
  sessionId: string;
  newStatus: string;
}
