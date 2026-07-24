import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionActionsController } from './session-actions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [SessionsController, SessionActionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}