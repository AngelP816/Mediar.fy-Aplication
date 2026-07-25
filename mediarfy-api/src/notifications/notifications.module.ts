import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { PushNotificationsModule } from '../push-notifications/push-notifications.module';

@Module({
  imports: [
    AuthModule,
    PushNotificationsModule,
  ],
  controllers: [
    NotificationsController,
  ],
  providers: [
    NotificationsService,
    NotificationsGateway,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
  ],
})
export class NotificationsModule {}