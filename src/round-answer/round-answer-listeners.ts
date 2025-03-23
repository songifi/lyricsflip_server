import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  AnswerSubmittedEvent,
  AnswerUpdatedEvent,
  AnswerValidatedEvent,
  AnswerDeletedEvent,
  BulkAnswersValidatedEvent,
  AnswerRateLimitExceededEvent,
  InvalidAnswerSubmittedEvent
} from './round-answer.events';
import { RoundAnswer } from './round-answer.entity';
import { NotificationService } from '../notification/notification.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { GameRoundService } from '../game-round/game-round.service';
import { UserService } from '../user/user.service';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class RoundAnswerEventListeners {
  private readonly logger = new Logger(RoundAnswerEventListeners.name);

  constructor(
    @InjectRepository(RoundAnswer)
    private answerRepository: Repository<RoundAnswer>,
    private notificationService: NotificationService,
    private websocketGateway: WebsocketGateway,
    private gameRoundService: GameRoundService,
    private userService: UserService,
    private auditLogService: AuditLogService,
  ) {}

  @OnEvent('answer.submitted')
  async handleAnswerSubmittedEvent(event: AnswerSubmittedEvent) {
    this.logger.log(`Answer submitted: ${event.answer.id} by user ${event.answer.userId}`);
    
    try {
      // Notify the round creator about new answer (optional, might not be needed for high-volume rounds)
      const round = await this.gameRoundService.findOne(event.answer.roundId);
      
      // Broadcast to round participants
      this.websocketGateway.broadcastToGameRoundParticipants(
        event.answer.roundId,
        'answer:submitted',
        {
          answerId: event.answer.id,
          userId: event.answer.userId,
          roundId: event.answer.roundId,
          timestamp: event.answer.createdAt
        }
      );
      
      // Update real-time stats in round
      this.websocketGateway.broadcastToGameRoundParticipants(
        event.answer.roundId,
        'round:stats:updated',
        {
          roundId: event.answer.roundId,
          answersCount: await this.answerRepository.count({ 
            where: { roundId: event.answer.roundId } 
          }),
          participantsCount: await this.answerRepository
            .createQueryBuilder('answer')
            .select('COUNT(DISTINCT answer.userId)', 'count')
            .where('answer.roundId = :roundId', { roundId: event.answer.roundId })
            .getRawOne()
            .then(result => result?.count || 0)
        }
      );
    } catch (error) {
      this.logger.error(`Error handling answer submitted event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('answer.updated')
  async handleAnswerUpdatedEvent(event: AnswerUpdatedEvent) {
    this.logger.log(`Answer updated: ${event.answer.id}`);
    
    try {
      // Broadcast to round administrators
      const round = await this.gameRoundService.findOne(event.answer.roundId);
      
      this.websocketGateway.broadcastToUser(
        round.creatorId,
        'answer:updated',
        {
          answerId: event.answer.id,
          userId: event.answer.userId,
          roundId: event.answer.roundId,
          timestamp: event.answer.updatedAt,
          reason: event.reason
        }
      );
    } catch (error) {
      this.logger.error(`Error handling answer updated event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('answer.validated')
  async handleAnswerValidatedEvent(event: AnswerValidatedEvent) {
    this.logger.log(`Answer validated: ${event.answer.id}, status: ${event.answer.status}`);
    
    try {
      // Notify the user who submitted the answer
      await this.notificationService.sendNotification(
        event.answer.userId,
        'Answer Validated',
        `Your answer in the round has been validated. Result: ${event.answer.isCorrect ? 'Correct' : 'Incorrect'}.`,
        {
          answerId: event.answer.id,
          roundId: event.answer.roundId,
          status: event.answer.status,
          score: event.answer.score
        }
      );
      
      // Broadcast to the user
      this.websocketGateway.broadcastToUser(
        event.answer.userId,
        'answer:validated',
        {
          answerId: event.answer.id,
          roundId: event.answer.roundId,
          status: event.answer.status,
          isCorrect: event.answer.isCorrect,
          score: event.answer.score
        }
      );
      
      // Update leaderboard if applicable
      if (event.answer.isCorrect) {
        this.updateRoundLeaderboard(event.answer.roundId);
      }
    } catch (error) {
      this.logger.error(`Error handling answer validated event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('answer.deleted')
  async handleAnswerDeletedEvent(event: AnswerDeletedEvent) {
    this.logger.log(`Answer deleted: ${event.answerId}`);
    
    try {
      // Update real-time stats in round
      this.websocketGateway.broadcastToGameRoundParticipants(
        event.roundId,
        'round:stats:updated',
        {
          roundId: event.roundId,
          answersCount: await this.answerRepository.count({ 
            where: { roundId: event.roundId } 
          }),
          participantsCount: await this.answerRepository
            .createQueryBuilder('answer')
            .select('COUNT(DISTINCT answer.userId)', 'count')
            .where('answer.roundId = :roundId', { roundId: event.roundId })
            .getRawOne()
            .then(result => result?.count || 0)
        }
      );
    } catch (error) {
      this.logger.error(`Error handling answer deleted event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('answers.bulk.validated')
  async handleBulkAnswersValidatedEvent(event: BulkAnswersValidatedEvent) {
    this.logger.log(`Bulk answers validated: ${event.answerIds.length} answers`);
    
    try {
      // Get affected rounds (could be multiple)
      const answers = await this.answerRepository.find({
        where: { id: In(event.answerIds) },
        select: ['id', 'roundId', 'userId']
      });
      
      // Group by roundId
      const roundMap = new Map<string, string[]>();
      const userMap = new Map<string, string[]>();
      
      answers.forEach(answer => {
        // Track rounds
        if (!roundMap.has(answer.roundId)) {
          roundMap.set(answer.roundId, []);
        }
        roundMap.get(answer.roundId).push(answer.id);
        
        // Track users
        if (!userMap.has(answer.userId)) {
          userMap.set(answer.userId, []);
        }
        userMap.get(answer.userId).push(answer.id);
      });
      
      // Notify users
      for (const [userId, answerIds] of userMap.entries()) {
        await this.notificationService.sendNotification(
          userId,
          'Answers Validated',
          `${answerIds.length} of your answers have been validated.`,
          {
            answerIds,
            status: event.status
          }
        );
        
        this.websocketGateway.broadcastToUser(
          userId,
          'answers:bulk:validated',
          {
            answerIds,
            status: event.status
          }
        );
      }
      
      // Update leaderboards for each affected round
      for (const roundId of roundMap.keys()) {
        this.updateRoundLeaderboard(roundId);
      }
    } catch (error) {
      this.logger.error(`Error handling bulk answers validated event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('answer.rateLimit.exceeded')
  async handleRateLimitExceededEvent(event: AnswerRateLimitExceededEvent) {
    this.logger.warn(`Rate limit exceeded: User ${event.userId}, round ${event.roundId}, attempt ${event.attemptCount}`);
    
    try {
      // Log to audit trail
      await this.auditLogService.logActivity({
        userId: event.userId,
        action: 'RATE_LIMIT_EXCEEDED',
        resourceType: 'ROUND_ANSWER',
        resourceId: event.roundId,
        metadata: {
          roundId: event.roundId,
          attemptCount: event.attemptCount
        }
      });
    } catch (error) {
      this.logger.error(`Error handling rate limit exceeded event: ${error.message}`, error.stack);
    }
  }

  @OnEvent('answer.invalid.submitted')
  async handleInvalidAnswerSubmittedEvent(event: InvalidAnswerSubmittedEvent) {
    this.logger.warn(`Invalid answer submitted: User ${event.userId}, round ${event.roundId}`);
    
    try {
      // Log to audit trail
      await this.auditLogService.logActivity({
        userId: event.userId,
        action: 'INVALID_ANSWER_SUBMITTED',
        resourceType: 'ROUND_ANSWER',
        resourceId: event.roundId,
        metadata: {
          roundId: event.roundId,
          errors: event.validationErrors
        }
      });
    } catch (error) {
      this.logger.error(`Error handling invalid answer event: ${error.message}`, error.stack);
    }
  }

  /**
   * Helper method to update round leaderboard
   */
  private async updateRoundLeaderboard(roundId: string): Promise<void> {
    try {
      // Calculate leaderboard data
      const leaderboardData = await this.answerRepository
        .createQueryBuilder('answer')
        .select([
          'answer.userId',
          'user.username',
          'user.avatarUrl',
          'SUM(answer.score) as totalScore',
          'COUNT(CASE WHEN answer.isCorrect = true THEN 1 END) as correctCount',
          'COUNT(answer.id) as totalAnswers'
        ])
        .leftJoin('answer.user', 'user')
        .where('answer.roundId = :roundId', { roundId })
        .groupBy('answer.userId')
        .addGroupBy('user.username')
        .addGroupBy('user.avatarUrl')
        .orderBy('totalScore', 'DESC')
        .limit(20)
        .getRawMany();
      
      // Broadcast updated leaderboard
      this.websocketGateway.broadcastToGameRoundParticipants(
        roundId,
        'round:leaderboard:updated',
        {
          roundId,
          leaderboard: leaderboardData,
          timestamp: new Date()
        }
      );
    } catch (error) {
      this.logger.error(`Error updating round leaderboard: ${error.message}`, error.stack);
    }
  }
}
