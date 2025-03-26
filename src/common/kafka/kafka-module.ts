import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Kafka, KafkaConfig } from 'kafkajs';
import { KafkaEventBus } from './kafka-event-bus.service';

@Module({})
export class KafkaModule {
  static forRoot(): DynamicModule {
    const kafkaClientProvider: Provider = {
      provide: 'KAFKA_CLIENT',
      useFactory: (configService: ConfigService) => {
        const brokers = configService.get<string>('KAFKA_BROKERS', 'localhost:9092')
          .split(',');
          
        const clientId = configService.get<string>('KAFKA_CLIENT_ID', 'lyrics-service');
        
        const config: KafkaConfig = {
          clientId,
          brokers,
        };
        
        // Add optional SSL configuration if provided
        const sslEnabled = configService.get<boolean>('KAFKA_SSL_ENABLED', false);
        if (sslEnabled) {
          config.ssl = {
            rejectUnauthorized: configService.get<boolean>('KAFKA_SSL_REJECT_UNAUTHORIZED', true),
          };
        }
        
        // Add optional SASL authentication if provided
        const saslEnabled = configService.get<boolean>('KAFKA_SASL_ENABLED', false);
        if (saslEnabled) {
          config.sasl = {
            mechanism: configService.get<string>('KAFKA_SASL_MECHANISM', 'plain'),
            username: configService.get<string>('KAFKA_SASL_USERNAME', ''),
            password: configService.get<string>('KAFKA_SASL_PASSWORD', ''),
          };
        }
        
        return new Kafka(config);
      },
      inject: [ConfigService],
    };

    return {
      module: KafkaModule,
      imports: [ConfigModule],
      providers: [
        kafkaClientProvider,
        KafkaEventBus,
      ],
      exports: [
        kafkaClientProvider,
        KafkaEventBus,
      ],
    };
  }
}