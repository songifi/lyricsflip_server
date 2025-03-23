import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  ConflictException,
  Logger 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RateLimiterService } from '../common/services/rate-limiter.service';
import { AnswerValidationService } from '../answer-validation/answer-validation.service';
import { GameRoundService } from '../game-round/game-round.service';
import { RoundAnswerRepository } from './round-answer.repository';
import { RoundAnswer, AnswerStatus } from './round-answer.entity';
import { 
  CreateAnswerDto, 
  UpdateAnswerDto, 
  ValidateAnswerDto, 
  AnswerFilterDto,
  BulkValidateAnswersDto,
  AnswerStatisticsDto
} from './round-answer.dto';
import { 
  AnswerSubmittedEvent,
  AnswerUpdatedEvent,
  AnswerValidatedEvent,
  AnswerDeletedEvent,
  BulkAnswersValidatedEvent,
  AnswerRateLimitExceededEvent,
  InvalidAnswerSubmittedEvent
} from './round-answer.events';
import { User } from '../user/user.entity';
import { GameRoundStatus } from '../game-round/game-round.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class RoundAnswerService {
  private readonly logger = new Logger(RoundAnswerService.name);
  private readonly RATE_LIMIT_WINDOW_MINUTES = 1;
  private readonly MAX_SUBMISSIONS_PER_WINDOW = 5;

  constructor(
    @InjectRepository(RoundAnswerRepository)
    private readonly answerRepository: RoundAnswerRepository,
    private readonly connection: Connection,
    private readonly eventEmitter: EventEmitter2,
    private readonly rateLimiterService: RateLimiterService,
    private readonly answerValidationService: AnswerValidationService,
    private readonly gameRoundService: GameRoundService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Submit a new answer
   */
  async submitAnswer(createAnswerDto: CreateAnswerDto, user: User): Promise<RoundAnswer> {
    const { roundId, answerText, metadata } = createAnswerDto;
    
    // Check if round exists and is active
    const round = await this.gameRoundService.findOne(roundId);
    if (round.status !== GameRoundStatus.ACTIVE) {
      throw new BadRequestException(`Cannot submit answers to a round with status ${round.status}`);
    }
    
    // Apply rate limiting
    const key = `answer:${user.id}:${roundId}`;
    const isRateLimited = await this.rateLimiterService.isRateLimited(
      key, 
      this.MAX_SUBMISSIONS_PER_WINDOW,
      this.RATE_LIMIT_WINDOW_MINUTES * 60
    );
    
    if (isRateLimited) {
      // Emit rate limit exceeded event
      const recentCount = await this.answerRepository.countRecentUserSubmissions(
        user.id, 
        roundId, 
        this.RATE_LIMIT_WINDOW_MINUTES
      );
      
      this.eventEmitter.emit(
        'answer.rateLimit.exceeded', 
        new AnswerRateLimitExceededEvent(user.id, roundId, recentCount)
      );
      
      throw new ConflictException(
        `Rate limit exceeded. Please wait before submitting another answer.`
      );
    }
    
    // Validate answer content
    const validationErrors = this.answerValidationService.validateAnswerContent(answerText);
    if (validationErrors.length > 0) {
      // Emit invalid answer event
      this.eventEmitter.emit(
        'answer.invalid.submitted',
        new InvalidAnswerSubmittedEvent(user.id, roundId, answerText, validationErrors)
      );
      
      throw new BadRequestException(validationErrors);
    }
    
    // Get the next submission attempt number
    const latestAttempt = await this.answerRepository.getLatestSubmissionAttempt(user.id, roundId);
    const submissionAttempt = latestAttempt + 1;
    
    // Create the answer - use a transaction for data consistency
    return this.connection.transaction(async (manager: EntityManager) => {
      // Increment rate limiter counter
      await this.rateLimiterService.increment(key);
      
      // Create new answer entity
      const answer = manager.create(RoundAnswer, {
        roundId,
        userId: user.id,
        answerText,
        metadata,
        status: AnswerStatus.PENDING,
        submissionAttempt,
        revisionHistory: [],
      });
      
      // Save the answer
      const savedAnswer = await manager.save(answer);
      
      // Emit answer submitted event
      this.eventEmitter.emit('answer.submitted', new AnswerSubmittedEvent(savedAnswer));
      
      // Log audit trail
      await this.auditLogService.logActivity({
        userId: user.id,
        action: 'ANSWER_SUBMITTED',
        resourceType: 'ROUND_ANSWER',
        resourceId: savedAnswer.id,
        metadata: {
          roundId,
          submissionAttempt
        }
      }, manager);
      
      return savedAnswer;
    });
  }

  /**
   * Find all answers with filtering options
   */
  async findAll(filterDto: AnswerFilterDto): Promise<[RoundAnswer[], number]> {
    return this.answerRepository.findAnswers(filterDto);
  }

  /**
   * Find answer by ID
   */
  async findOne(id: string): Promise<RoundAnswer> {
    const answer = await this.answerRepository.findOne(id, {
      relations: ['user']
    });
    
    if (!answer) {
      throw new NotFoundException(`Answer with ID "${id}" not found`);
    }
    
    return answer;
  }

  /**
   * Update an existing answer
   */
  async updateAnswer(
    id: string, 
    updateAnswerDto: UpdateAnswerDto, 
    user: User
  ): Promise<RoundAnswer> {
    const { answerText, reason } = updateAnswerDto;
    
    // Get current answer
    const answer = await this.findOne(id);
    
    // Check if user is authorized to update this answer
    const isOwner = answer.userId === user.id;
    const isAdmin = user.roles?.includes('admin');
    
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this answer');
    }
    
    // Check if answer can be updated based on status
    if (answer.status !== AnswerStatus.PENDING && !isAdmin) {
      throw new BadRequestException(
        `Cannot update an answer with status ${answer.status}`
      );
    }
    
    // Get round status to ensure it's still active (unless admin)
    if (!isAdmin) {
      const round = await this.gameRoundService.findOne(answer.roundId);
      if (round.status !== GameRoundStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot update answers in a round with status ${round.status}`
        );
      }
    }
    
    // Validate answer content
    const validationErrors = this.answerValidationService.validateAnswerContent(answerText);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors);
    }
    
    // Use transaction for data consistency
    return this.connection.transaction(async (manager: EntityManager) => {
      // Store previous text for history
      const previousText = answer.answerText;
      
      // Update revision history
      const revisionEntry = {
        timestamp: new Date(),
        previousText,
        updatedBy: user.id,
        reason: reason || 'Update',
      };
      
      answer.revisionHistory = [...answer.revisionHistory, revisionEntry];
      answer.answerText = answerText;
      
      // Save the updated answer
      const updatedAnswer = await manager.save(answer);
      
      // Emit answer updated event
      this.eventEmitter.emit(
        'answer.updated', 
        new AnswerUpdatedEvent(updatedAnswer, previousText, reason)
      );
      
      // Log audit trail
      await this.auditLogService.logActivity({
        userId: user.id,
        action: 'ANSWER_UPDATED',
        resourceType: 'ROUND_ANSWER',
        resourceId: updatedAnswer.id,
        metadata: {
          roundId: answer.roundId,
          previousText,
          reason
        }
      }, manager);
      
      return updatedAnswer;
    });
  }

  /**
   * Delete an answer
   */
  async deleteAnswer(id: string, user: User): Promise<void> {
    const answer = await this.findOne(id);
    
    // Check if user is authorized to delete this answer
    const isOwner = answer.userId === user.id;
    const isAdmin = user.roles?.includes('admin');
    
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this answer');
    }
    
    // Use soft delete to maintain history
    await this.answerRepository.softDelete(id);
    
    // Emit answer deleted event
    this.eventEmitter.emit(
      'answer.deleted', 
      new AnswerDeletedEvent(id, user.id, answer.roundId)
    );
    
    // Log audit trail
    await this.auditLogService.logActivity({
      userId: user.id,
      action: 'ANSWER_DELETED',
      resourceType: 'ROUND_ANSWER',
      resourceId: id,
      metadata: {
        roundId: answer.roundId
      }
    });
  }

  /**
   * Validate an answer
   */
  async validateAnswer(
    id: string, 
    validateAnswerDto: ValidateAnswerDto, 
    user: User
  ): Promise<RoundAnswer> {
    const { status, isCorrect, score, validationResults } = validateAnswerDto;
    
    // Only admins can validate answers
    if (!user.roles?.includes('admin')) {
      throw new ForbiddenException('Only administrators can validate answers');
    }
    
    // Get current answer
    const answer = await this.findOne(id);
    
    // Use transaction for data consistency
    return this.connection.transaction(async (manager: EntityManager) => {
      // Store previous status for event
      const previousStatus = answer.status;
      
      // Update answer with validation results
      answer.status = status;
      answer.isCorrect = isCorrect;
      
      if (score !== undefined) {
        answer.score = score;
      }
      
      if (validationResults) {
        answer.validationResults = validationResults;
      }
      
      // Save the validated answer
      const validatedAnswer = await manager.save(answer);
      
      // Emit answer validated event
      this.eventEmitter.emit(
        'answer.validated', 
        new AnswerValidatedEvent(validatedAnswer, previousStatus)
      );
      
      // Log audit trail
      await this.auditLogService.logActivity({
        userId: user.id,
        action: 'ANSWER_VALIDATED',
        resourceType: 'ROUND_ANSWER',
        resourceId: validatedAnswer.id,
        metadata: {
          roundId: answer.roundId,
          previousStatus,
          newStatus: status,
          isCorrect,
          score
        }
      }, manager);
      
      return validatedAnswer;
    });
  }

  /**
   * Bulk validate multiple answers
   */
  async bulkValidateAnswers(
    bulkValidateDto: BulkValidateAnswersDto,
    user: User
  ): Promise<number> {
    const { answerIds, status, isCorrect, score } = bulkValidateDto;
    
    // Only admins can validate answers
    if (!user.roles?.includes('admin')) {
      throw new ForbiddenException('Only administrators can validate answers');
    }
    
    // Use transaction for data consistency
    return this.connection.transaction(async (manager: EntityManager) => {
      // Update all answers in the list
      const updateData: any = { status };
      
      if (isCorrect !== undefined) {
        updateData.isCorrect = isCorrect;
      }
      
      if (score !== undefined) {
        updateData.score = score;
      }
      
      // Execute the bulk update
      const result = await manager
        .createQueryBuilder()
        .update(RoundAnswer)
        .set(updateData)
        .whereInIds(answerIds)
        .execute();
      
      // Emit bulk validated event
      this.eventEmitter.emit(
        'answers.bulk.validated', 
        new BulkAnswersValidatedEvent(answerIds, status, user.id)
      );
      
      // Log audit trail
      await this.auditLogService.logActivity({
        userId: user.id,
        action: 'BULK_ANSWERS_VALIDATED',
        resourceType: 'ROUND_ANSWER',
        resourceId: 'BULK',
        metadata: {
          answerIds,
          status,
          isCorrect,
          score,
          affectedCount: result.affected
        }
      }, manager);
      
      return result.affected || 0;
    });
  }

  /**
   * Get answer revision history
   */
  async getAnswerHistory(id: string, user: User): Promise<any> {
    const answer = await this.answerRepository.getAnswerHistory(id);
    
    if (!answer) {
      throw new NotFoundException(`Answer with ID "${id}" not found`);
    }
    
    // Check authorization - owners, admins, or round creators can see history
    const isOwner = answer.userId === user.id;
    const isAdmin = user.roles?.includes('admin');
    const round = await this.gameRoundService.findOne(answer.roundId);
    const isRoundCreator = round.creatorId === user.id;
    
    if (!isOwner && !isAdmin && !isRoundCreator) {
      throw new ForbiddenException('You do not have permission to view this answer history');
    }
    
    return {
      id: answer.id,
      roundId: answer.roundId,
      userId: answer.userId,
      username: answer.user.username,
      currentText: answer.answerText,
      status: answer.status,
      score: answer.score,
      isCorrect: answer.isCorrect,
      submissionAttempt: answer.submissionAttempt,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
      revisionHistory: answer.revisionHistory,
    };
  }

  /**
   * Get answer statistics for a round
   */
  async getAnswerStatistics(
    statsDto: AnswerStatisticsDto,
    user: User
  ): Promise<any> {
    const { roundId, groupByUser, includeDetails } = statsDto;
    
    // Check if round exists
    const round = await this.gameRoundService.findOne(roundId);
    
    // Check authorization - only round creator or admin can see statistics
    const isAdmin = user.roles?.includes('admin');
    const isRoundCreator = round.creatorId === user.id;
    
    if (!isAdmin && !isRoundCreator) {
      throw new ForbiddenException('You do not have permission to view these statistics');
    }
    
    // Get basic statistics
    const statistics = await this.answerRepository.getAnswerStatistics(roundId);
    
    // Add user breakdown if requested
    if (groupByUser) {
      const userStats = await this.answerRepository.getAnswersByUser(roundId);
      statistics.userBreakdown = userStats;
    }
    
    // Add detailed answers if requested
    if (includeDetails) {
      const [answers] = await this.answerRepository.findAnswers({
        roundId,
        limit: 1000, // Reasonable limit for details
        sortBy: 'createdAt',
        order: 'DESC'
      });
      
      statistics.answers = answers.map(answer => ({
        id: answer.id,
        userId: answer.userId,
        username: answer.user.username,
        answerText: answer.answerText,
        status: answer.status,
        score: answer.score,
        isCorrect: answer.isCorrect,
        createdAt: answer.createdAt
      }));
    }
    
    return statistics;
  }

  /**
   * Find user's answers for a specific round
   */
  async findUserAnswersForRound(roundId: string, userId: string): Promise<RoundAnswer[]> {
    const [answers] = await this.answerRepository.findAnswers({
      roundId,
      userId,
      sortBy: 'createdAt',
      order: 'DESC'
    });
    
    return answers;
  }

  /**
   * Count user's answers for a specific round
   */
  async countUserAnswersForRound(roundId: string, userId: string): Promise<number> {
    const count = await this.answerRepository.count({
      where: {
        roundId,
        userId
      }
    });
    
    return count;
  }

  /**
   * Auto-validate answers using validation service
   * This can be called by a scheduled job for bulk processing
   */
  async autoValidateAnswers(roundId: string): Promise<number> {
    // Find all pending answers for the round
    const [pendingAnswers] = await this.answerRepository.findAnswers({
      roundId,
      status: AnswerStatus.PENDING,
      limit: 1000 // Process in batches if needed
    });
    
    if (pendingAnswers.length === 0) {
      return 0;
    }
    
    // Use transaction for data consistency
    return this.connection.transaction(async (manager: EntityManager) => {
      let validatedCount = 0;
      
      for (const answer of pendingAnswers) {
        try {
          // Call automatic validation service
          const validationResult = await this.answerValidationService.autoValidateAnswer(
            answer.answerText,
            roundId
          );
          
          // Update answer with validation results
          answer.status = AnswerStatus.VALIDATED;
          answer.isCorrect = validationResult.isCorrect;
          answer.score = validationResult.score;
          answer.validationResults = validationResult.details;
          
          await manager.save(answer);
          
          // Emit validation event
          this.eventEmitter.emit(
            'answer.validated',
            new AnswerValidatedEvent(answer, AnswerStatus.PENDING)
          );
          
          validatedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to auto-validate answer ${answer.id}: ${error.message}`,
            error.stack
          );
        }
      }
      
      // Log audit trail for bulk operation
      await this.auditLogService.logActivity({
        userId: 'SYSTEM',
        action: 'AUTO_VALIDATE_ANSWERS',
        resourceType: 'ROUND_ANSWER',
        resourceId: 'BULK',
        metadata: {
          roundId,
          processedCount: pendingAnswers.length,
          validatedCount
        }
      }, manager);
      
      return validatedCount;
    });
  }
}
