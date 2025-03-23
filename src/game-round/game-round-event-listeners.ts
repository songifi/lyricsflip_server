import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { 
  GameRoundCreatedEvent,
  GameRoundStatusChangedEvent,
  GameRoundStartedEvent,
  GameRoundCompletedEvent,
  GameRoundDeletedEvent,
  ParticipantJoinedGameRoundEvent,
  ParticipantLeftGameRoundEvent
} from './game-round.events';
import { GameRound } from './game-round.entity';
import { NotificationService } from '../notification/notification.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class GameRoundEventListeners {
  private readonly logger = new Logger(GameRoundEventListeners.name);

  constructor(
    @InjectRepository(GameRound)
    private gameRoundRepository: Repository<GameRound>,
    private notificationService: NotificationService,
    private websocketGateway: WebsocketGateway,
  ) {}

  @OnEvent('game-round.created')
  async handleGameRoundCreatedEvent(event: GameRoundCreatedEvent) {
    this.logger.log(`Game round created: ${event.gameRound.id}`);
    
    // Notify creator
    await this.notificationService.sendNotification(
      event.gameRound.creatorId,
      'Game Round Created',
      `Your game round "${event.gameRound.title}" has been created successfully.`
    );
    
    // Broadcast to all users if public
    if (event.gameRound.isPublic) {
      this.websocketGateway.broadcastGameRound(
        'gameRound:created', 
        {
          id: event.gameRound.id,
          title: event.gameRound.title,
          creator: {
            id: event.gameRound.creator.id,
            username: event.gameRound.creator.username
          },
          song: {
            id: event.gameRound.song.id,
            title: event.gameRound.song.title
          },
          status: event.gameRound.status,
          scheduledStartTime: event.gameRound.scheduledStartTime
        }
      );
    }
  }

  @OnEvent('game-round.status.changed')
  async handleGameRoundStatusChangedEvent(event: GameRoundStatusChangedEvent) {
    this.logger.log(`Game round ${event.gameRound.id} status changed from ${event.previousStatus} to ${event.gameRound.status}`);
    
    // Broadcast status change to all participants
    this.websocketGateway.broadcastToGameRoundParticipants(
      event.gameRound.id,
      'gameRound:statusChanged',
      {
        roundId: event.gameRound.id,
        previousStatus: event.previousStatus,
        newStatus: event.gameRound.status,
      }
    );
  }

  @OnEvent('game-round.started')
  async handleGameRoundStartedEvent(event: GameRoundStartedEvent) {
    this.logger.log(`Game round started: ${event.gameRound.id}`);
    
    // Notify creator
    await this.notificationService.sendNotification(
      event.gameRound.creatorId,
      'Game Round Started',
      `Your game round "${event.gameRound.title}" has started.`
    );
    
    // Broadcast to public feed if public
    if (event.gameRound.isPublic) {
      this.websocketGateway.broadcastGameRound(
        'gameRound:started',
        {
          id: event.gameRound.id,
          title: event.gameRound.title,
          actualStartTime: event.gameRound.actualStartTime,
        }
      );
    }
  }

  @OnEvent('game-round.completed')
  async handleGameRoundCompletedEvent(event: GameRoundCompletedEvent) {
    this.logger.log(`Game round completed: ${event.gameRound.id}`);
    
    // Notify creator
    await this.notificationService.sendNotification(
      event.gameRound.creatorId,
      'Game Round Completed',
      `Your game round "${event.gameRound.title}" has been completed.`
    );
    
    // Notify all participants
    this.websocketGateway.broadcastToGameRoundParticipants(
      event.gameRound.id,
      'gameRound:completed',
      {
        roundId: event.gameRound.id,
        title: event.gameRound.title,
        endTime: event.gameRound.endTime,
      }
    );
  }

  @OnEvent('game-round.deleted')
  async handleGameRoundDeletedEvent(event: GameRoundDeletedEvent) {
    this.logger.log(`Game round deleted: ${event.gameRoundId}`);
    
    // Nothing specific to do here as the round is gone
    // Could add analytics or audit logging if needed
  }

  @OnEvent('game-round.participant.joined')
  async handleParticipantJoinedEvent(event: ParticipantJoinedGameRoundEvent) {
    this.logger.log(`User ${event.userId} joined game round ${event.gameRound.id}`);
    
    // Notify creator if different from participant
    if (event.userId !== event.gameRound.creatorId) {
      await this.notificationService.sendNotification(
        event.gameRound.creatorId,
        'New Participant',
        `A new participant has joined your game round "${event.gameRound.title}".`
      );
    }
    
    // Broadcast to all participants
    this.websocketGateway.broadcastToGameRoundParticipants(
      event.gameRound.id,
      'gameRound:participantJoined',
      {
        roundId: event.gameRound.id,
        userId: event.userId,
      }
    );
  }

  @OnEvent('game-round.participant.left')
  async handleParticipantLeftEvent(event: ParticipantLeftGameRoundEvent) {
    this.logger.log(`User ${event.userId} left game round ${event.gameRound.id}`);
    
    // Broadcast to all participants
    this.websocketGateway.broadcastToGameRoundParticipants(
      event.gameRound.id,
      'gameRound:participantLeft',
      {
        roundId: event.gameRound.id,
        userId: event.userId,
      }
    );
  }
}
