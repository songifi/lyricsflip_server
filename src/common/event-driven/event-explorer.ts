import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, ModuleRef } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { EVENT_HANDLER_METADATA, SAGA_METADATA } from './decorators';
import { EventBusService } from './event-bus.service';
import { IEventHandler } from './interfaces';

@Injectable()
export class EventExplorerService implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly moduleRef: ModuleRef,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.exploreSagas();
    this.exploreEventHandlers();
  }

  private exploreSagas() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();
    const instances = [
      ...providers,
      ...controllers,
    ].filter(wrapper => wrapper.instance);

    for (const wrapper of instances) {
      const { instance } = wrapper;
      const prototype = Object.getPrototypeOf(instance);
      
      this.metadataScanner.scanFromPrototype(
        instance,
        prototype,
        method => this.registerSagaMethod(wrapper.instance, method),
      );
    }
  }

  private registerSagaMethod(instance: any, methodName: string) {
    const metadata = Reflect.getMetadata(
      SAGA_METADATA,
      instance[methodName],
    );

    if (metadata) {
      const saga = instance[methodName].bind(instance);
      // Here we would register the saga methods
      // This is a placeholder for more complex saga implementations
    }
  }

  private exploreEventHandlers() {
    const providers = this.discoveryService.getProviders();
    const eventHandlers = providers
      .filter(wrapper => this.isEventHandler(wrapper))
      .map(wrapper => ({
        handler: wrapper.instance as IEventHandler,
        events: this.getEventsMetadata(wrapper),
      }));

    eventHandlers.forEach(({ handler, events }) => {
      events.forEach(event => {
        this.eventBus.subscribe(event, handler);
      });
    });
  }

  private isEventHandler(wrapper: InstanceWrapper): boolean {
    const { instance } = wrapper;
    if (!instance) return false;

    const eventsMetadata = this.getEventsMetadata(wrapper);
    return eventsMetadata.length > 0;
  }

  private getEventsMetadata(wrapper: InstanceWrapper): Type<any>[] {
    const { instance } = wrapper;
    const prototype = Object.getPrototypeOf(instance);
    
    return Reflect.getMetadata(EVENT_HANDLER_METADATA, prototype.constructor) || [];
  }
}