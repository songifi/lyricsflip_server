import { Injectable, Type, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { IEvent, IEventHandler, IEventBus, EventMetadata } from './interfaces';

@Injectable()
export class EventBusService implements IEventBus {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish<T>(event: IEvent<T>): Promise<void> {
    try {
      // Ensure event has proper metadata
      const enrichedEvent = this.enrichEventMetadata(event);
      
      this.logger.debug(
        `Publishing event ${enrichedEvent.name} with correlationId: ${enrichedEvent.metadata.correlationId}`
      );
      
      this.eventEmitter.emit(
        this.getEventName(enrichedEvent),
        enrichedEvent,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${event.name}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async publishAll(events: IEvent[]): Promise<void> {
    await Promise.all(events.map(event => this.publish(event)));
  }

  subscribe<T>(
    event: Type<IEvent<T>>,
    handler: IEventHandler<T>,
  ): void {
    const eventName = this.getEventNameFromType(event);
    
    this.logger.debug(`Subscribing to event: ${eventName}`);
    
    this.eventEmitter.on(
      eventName,
      async (event: IEvent<T>) => {
        try {
          this.logger.debug(
            `Handling event ${event.name} with correlationId: ${event.metadata.correlationId}`
          );
          await handler.handle(event);
        } catch (error) {
          this.logger.error(
            `Error handling event ${event.name}: ${error.message}`,
            error.stack
          );
          // In a more advanced implementation, we would implement
          // retry logic and dead-letter queue here
        }
      },
    );
  }

  private getEventName(event: IEvent): string {
    return event.name;
  }

  private getEventNameFromType<T>(event: Type<IEvent<T>>): string {
    const instance = new event({ }) as IEvent;
    return instance.name;
  }

  private enrichEventMetadata<T>(event: IEvent<T>): IEvent<T> {
    if (event.metadata && event.metadata.correlationId) {
      return event;
    }

    const metadata: EventMetadata = {
      timestamp: new Date(),
      correlationId: uuidv4(),
      ...event.metadata,
    };

    return {
      ...event,
      metadata,
    };
  }
}