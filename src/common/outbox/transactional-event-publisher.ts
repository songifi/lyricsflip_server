import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, QueryRunner, Repository } from 'typeorm';
import { OutboxEvent, OutboxStatus } from './outbox-event.entity';
import { IEvent } from '../events/interfaces';

@Injectable()
export class TransactionalEventPublisher {
  private readonly logger = new Logger(TransactionalEventPublisher.name);

  constructor(
    @InjectRepository(OutboxEvent)
    private outboxRepository: Repository<OutboxEvent>,
    private connection: Connection,
  ) {}

  async publishWithTransaction<T>(
    event: IEvent<T>,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const shouldManageTransaction = !queryRunner;
    const qr = queryRunner || this.connection.createQueryRunner();
    
    try {
      if (shouldManageTransaction) {
        await qr.connect();
        await qr.startTransaction();
      }
      
      // Save event to outbox
      const outboxEvent = new OutboxEvent();
      outboxEvent.eventName = event.name;
      outboxEvent.payload = event.payload;
      outboxEvent.metadata = event.metadata;
      outboxEvent.status = OutboxStatus.PENDING;
      
      await qr.manager.save(outboxEvent);
      
      if (shouldManageTransaction) {
        await qr.commitTransaction();
      }
      
      this.logger.debug(
        `Stored event ${event.name} in outbox with id: ${outboxEvent.id}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store event in outbox: ${error.message}`,
        error.stack
      );
      
      if (shouldManageTransaction && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      
      throw error;
    } finally {
      if (shouldManageTransaction && !qr.isReleased) {
        await qr.release();
      }
    }
  }

  async publishMultipleWithTransaction(
    events: IEvent[],
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const shouldManageTransaction = !queryRunner;
    const qr = queryRunner || this.connection.createQueryRunner();
    
    try {
      if (shouldManageTransaction) {
        await qr.connect();
        await qr.startTransaction();
      }
      
      // Save events to outbox
      const outboxEvents = events.map(event => {
        const outboxEvent = new OutboxEvent();
        outboxEvent.eventName = event.name;
        outboxEvent.payload = event.payload;
        outboxEvent.metadata = event.metadata;
        outboxEvent.status = OutboxStatus.PENDING;
        return outboxEvent;
      });
      
      await qr.manager.save(outboxEvents);
      
      if (shouldManageTransaction) {
        await qr.commitTransaction();
      }
      
      this.logger.debug(
        `Stored ${events.length} events in outbox`
      );
    } catch (error) {
      this.logger.error(
        `Failed to store multiple events in outbox: ${error.message}`,
        error.stack
      );
      
      if (shouldManageTransaction && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      
      throw error;
    } finally {
      if (shouldManageTransaction && !qr.isReleased) {
        await qr.release();
      }
    }
  }

  // Schedule an event to be published at a future date
  async scheduleEvent<T>(
    event: IEvent<T>,
    scheduledFor: Date,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const shouldManageTransaction = !queryRunner;
    const qr = queryRunner || this.connection.createQueryRunner();
    
    try {
      if (shouldManageTransaction) {
        await qr.connect();
        await qr.startTransaction();
      }
      
      // Save event to outbox with scheduled time
      const outboxEvent = new OutboxEvent();
      outboxEvent.eventName = event.name;
      outboxEvent.payload = event.payload;
      outboxEvent.metadata = event.metadata;
      outboxEvent.status = OutboxStatus.PENDING;
      outboxEvent.scheduledFor = scheduledFor;
      
      await qr.manager.save(outboxEvent);
      
      if (shouldManageTransaction) {
        await qr.commitTransaction();
      }
      
      this.logger.debug(
        `Scheduled event ${event.name} in outbox for ${scheduledFor}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule event in outbox: ${error.message}`,
        error.stack
      );
      
      if (shouldManageTransaction && qr.isTransactionActive) {
        await qr.rollbackTransaction();
      }
      
      throw error;
    } finally {
      if (shouldManageTransaction && !qr.isReleased) {
        await qr.release();
      }
    }
  }
}