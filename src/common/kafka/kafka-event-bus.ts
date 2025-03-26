import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, Message } from 'kafkajs';
import { IEvent, IEventBus } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KafkaEventBus implements IEventBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaEventBus.name);
  private producer: Producer;
  private consumer: Consumer;
  private readonly topicPrefix: string;

  constructor(
    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: Kafka,
    private readonly configService: ConfigService,
  ) {
    this.producer = this.kafkaClient.producer({
      allowAutoTopicCreation: true,
      idempotent: true,
    });
    
    this.consumer = this.kafkaClient.consumer({
      groupId: `lyrics-service-${uuidv4().substr(0, 8)}`,
    });
    
    this.topicPrefix = this.configService.get<string>('KAFKA_TOPIC_PREFIX', 'lyrics');
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');
    
    await this.consumer.connect();
    this.logger.log('Kafka consumer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('Kafka producer disconnected');
    
    await this.consumer.disconnect();
    this.logger.log('Kafka consumer disconnected');
  }

  async publish<T>(event: IEvent<T>): Promise<void> {
    try {
      const topic = this.getTopicForEvent(event);
      const message = this.createKafkaMessage(event);
      
      await this.producer.send({
        topic,
        messages: [message],
      });
      
      this.logger.debug(
        `Published event ${event.name} to Kafka topic ${topic} with key ${message.key}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish event to Kafka: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async publishAll(events: IEvent[]): Promise<void> {
    // Group messages by topic
    const messagesByTopic = events.reduce((acc, event) => {
      const topic = this.getTopicForEvent(event);
      
      if (!acc[topic]) {
        acc[topic] = [];
      }
      
      acc[topic].push(this.createKafkaMessage(event));
      return acc;
    }, {});
    
    try {
      // Send messages for each topic
      await Promise.all(
        Object.entries(messagesByTopic).map(([topic, messages]) => 
          this.producer.send({
            topic,
            messages: messages as Message[],
          })
        )
      );
      
      this.logger.debug(
        `Published ${events.length} events to Kafka`
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish multiple events to Kafka: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  // Note: In Kafka, subscriptions are handled differently than with an in-memory event bus
  // This method sets up a subscription to a Kafka topic
  async subscribe<T>(
    event: any,
    handler: any,
  ): Promise<void> {
    const eventName = typeof event === 'function' ? new event().name : event;
    const topic = this.getTopicName(eventName);
    
    try {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      
      this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventData = JSON.parse(message.value.toString());
            const event = {
              name: eventData.eventName,
              payload: eventData.payload,
              metadata: eventData.metadata,
            };
            
            await handler.handle(event);
          } catch (error) {
            this.logger.error(
              `Error processing Kafka message: ${error.message}`,
              error.stack
            );
          }
        },
      });
      
      this.logger.log(`Subscribed to Kafka topic: ${topic}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to Kafka topic ${topic}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private getTopicForEvent(event: IEvent): string {
    return this.getTopicName(event.name);
  }

  private getTopicName(eventName: string): string {
    // Convert event name to topic name
    // Example: 'lyrics.created' -> 'lyrics-lyrics-created'
    const normalizedName = eventName.replace(/\./g, '-');
    return `${this.topicPrefix}-${normalizedName}`;
  }

  private createKafkaMessage<T>(event: IEvent<T>): Message {
    const value = JSON.stringify({
      eventName: event.name,
      payload: event.payload,
      metadata: {
        ...event.metadata,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Use correlation ID as key for ordered delivery of related events
    const key = event.metadata?.correlationId || uuidv4();
    
    return {
      key,
      value,
      headers: {
        'event-name': event.name,
        'correlation-id': key,
      },
    };
  }
}