import { Module, Global, DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventExplorerService } from './event-explorer.service';
import { OutboxModule } from '../outbox/outbox.module';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Using wildcards in event names
      wildcard: true,
      // Use delimiter to enable namespaced events
      delimiter: '.',
      // Increase max listeners to avoid memory leak warnings
      maxListeners: 20,
      // Enable verbose memory leak warnings in development
      verboseMemoryLeak: process.env.NODE_ENV !== 'production',
    }),
    DiscoveryModule,
    OutboxModule,
  ],
  providers: [
    EventBusService,
    EventExplorerService,
  ],
  exports: [
    EventBusService,
  ],
})
export class EventsModule {
  static forRoot(): DynamicModule {
    return {
      module: EventsModule,
      imports: [
        EventEmitterModule.forRoot({
          wildcard: true,
          delimiter: '.',
          maxListeners: 20,
          verboseMemoryLeak: process.env.NODE_ENV !== 'production',
        }),
        DiscoveryModule,
        OutboxModule,
      ],
      providers: [
        EventBusService,
        EventExplorerService,
      ],
      exports: [
        EventBusService,
      ],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: EventsModule,
      imports: [DiscoveryModule],
      providers: [
        EventExplorerService,
      ],
    };
  }
}