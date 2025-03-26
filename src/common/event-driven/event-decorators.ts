import { SetMetadata } from '@nestjs/common';

export const EVENT_HANDLER_METADATA = 'event_handler_metadata';

export const EventsHandler = (...events: Function[]) =>
  SetMetadata(EVENT_HANDLER_METADATA, events);

export const SAGA_METADATA = 'saga_metadata';

export const Saga = () => SetMetadata(SAGA_METADATA, true);