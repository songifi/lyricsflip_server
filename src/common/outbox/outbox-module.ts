import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OutboxEvent } from './outbox-event.entity';
import { OutboxProcessorService } from './outbox-processor.service';
import { TransactionalEventPublisher } from './transactional-event-publisher.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    OutboxProcessorService,
    TransactionalEventPublisher,
  ],
  exports: [
    TransactionalEventPublisher,
  ],
})
export class OutboxModule {}