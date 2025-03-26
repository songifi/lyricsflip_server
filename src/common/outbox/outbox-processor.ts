import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, LessThan, Repository } from 'typeorm';
import { OutboxEvent, OutboxStatus } from './outbox-event.entity';
import { EventBusService } from '../events/event-bus.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private processing = false;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  constructor(
    @InjectRepository(OutboxEvent)
    private outboxRepository: Repository<OutboxEvent>,
    private eventBusService: EventBusService,
    private connection: Connection,
    private configService: ConfigService,
  ) {
    this.batchSize = this.configService.get<number>('OUTBOX_BATCH_SIZE', 50);
    this.maxRetries = this.configService.get<number>('OUTBOX_MAX_RETRIES', 5);
  }

  onModuleInit() {
    // Process immediately on startup
    this.processOutbox();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processOutbox() {
    if (this.processing) {
      return;
    }

    this.processing = true;
    try {
      await this.processOutboxEvents();
    } catch (error) {
      this.logger.error(
        `Error processing outbox events: ${error.message}`,
        error.stack
      );
    } finally {
      this.processing = false;
    }
  }

  private async processOutboxEvents() {
    // Process events in a loop until no more pending events are found
    let processedCount = 0;
    
    while (true) {
      // Start a transaction for updating event status
      const queryRunner = this.connection.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        // Find pending events, prioritize older events and respect scheduled time
        const events = await queryRunner.manager.find(OutboxEvent, {
          where: [
            { 
              status: OutboxStatus.PENDING, 
              scheduledFor: null 
            },
            { 
              status: OutboxStatus.PENDING, 
              scheduledFor: LessThan(new Date()) 
            }
          ],
          order: { createdAt: 'ASC' },
          take: this.batchSize,
          lock: { mode: 'pessimistic_write' },
        });
        
        if (events.length === 0) {
          await queryRunner.commitTransaction();
          break; // No more events to process
        }
        
        // Mark events as processing
        for (const event of events) {
          event.status = OutboxStatus.PROCESSING;
        }
        await queryRunner.manager.save(events);
        await queryRunner.commitTransaction();
        
        // Process events outside transaction
        for (const event of events) {
          await this.processEvent(event);
          processedCount++;
        }
      } catch (error) {
        this.logger.error(
          `Transaction error processing outbox batch: ${error.message}`,
          error.stack
        );
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
      }
    }
    
    if (processedCount > 0) {
      this.logger.debug(`Processed ${processedCount} outbox events`);
    }
  }

  private async processEvent(event: OutboxEvent) {
    try {
      // Recreate the original event
      const originalEvent = {
        name: event.eventName,
        payload: event.payload,
        metadata: event.metadata || {},
      };
      
      // Publish to the event bus
      await this.eventBusService.publish(originalEvent);
      
      // Mark as published
      await this.outboxRepository.update(event.id, {
        status: OutboxStatus.PUBLISHED,
        processedAt: new Date()
      });
      
      this.logger.debug(
        `Successfully published event ${event.eventName} from outbox with id: ${event.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to process outbox event ${event.id}: ${error.message}`,
        error.stack
      );
      
      // Handle retry logic
      if (event.retryCount < this.maxRetries) {
        await this.outboxRepository.update(event.id, {
          status: OutboxStatus.PENDING,
          retryCount: event.retryCount + 1,
          errorMessage: error.message,
        });
      } else {
        // Mark as failed after max retries
        await this.outboxRepository.update(event.id, {
          status: OutboxStatus.FAILED,
          errorMessage: error.message,
        });
        
        this.logger.warn(
          `Outbox event ${event.id} exceeded max retries and was marked as failed`
        );
      }
    }
  }

  // Manually retry failed events
  async retryFailedEvents() {
    const failedEvents = await this.outboxRepository.find({
      where: { status: OutboxStatus.FAILED },
    });
    
    if (failedEvents.length === 0) {
      return;
    }
    
    this.logger.log(`Retrying ${failedEvents.length} failed outbox events`);
    
    for (const event of failedEvents) {
      await this.outboxRepository.update(event.id, {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        errorMessage: null,
      });
    }
  }
}