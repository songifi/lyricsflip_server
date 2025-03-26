import { Type } from '@nestjs/common';

export interface IEvent<T = any> {
  readonly name: string;
  readonly payload: T;
  readonly metadata: EventMetadata;
}

export interface EventMetadata {
  readonly timestamp: Date;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly userId?: string;
}

export interface IEventHandler<T = any> {
  handle(event: IEvent<T>): Promise<void>;
}

export interface IEventBus {
  publish<T>(event: IEvent<T>): Promise<void>;
  publishAll(events: IEvent[]): Promise<void>;
  subscribe<T>(event: Type<IEvent<T>>, handler: IEventHandler<T>): void;
}

export interface EventBusOptions {
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableDeadLetter?: boolean;
  deadLetterExchange?: string;
}