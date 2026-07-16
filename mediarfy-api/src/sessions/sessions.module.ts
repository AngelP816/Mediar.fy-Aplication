import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionActionsController } from './session-actions.controller';
@Module({
  imports: [AuthModule],
  controllers: [SessionsController, SessionActionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}