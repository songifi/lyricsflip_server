import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationFactoryService } from './notification-factory.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationIntegrationService } from './notification-integration.service';
import { Notification, NotificationSchema } from './notification.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema }
    ]),
    EventEmitterModule.forRoot(),
    AuthModule
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService, 
    NotificationFactoryService,
    NotificationGateway,
    NotificationIntegrationService
  ],
  exports: [
    NotificationService, 
    NotificationFactoryService, 
    NotificationGateway,
    NotificationIntegrationService
  ]
})
export class NotificationModule {}
