import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatPresenceService } from './chat-presence.service';
import { CaseDocumentsModule } from '../case-documents/case-documents.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    CaseDocumentsModule,
  ],
  controllers: [
    ChatController,
  ],
  providers: [
    ChatService,
    ChatGateway,
    ChatPresenceService,
  ],
  exports: [
    ChatService,
    ChatGateway,
  ],
})
export class ChatModule {}
