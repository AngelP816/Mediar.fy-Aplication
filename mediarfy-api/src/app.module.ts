import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MediationRequestsModule } from './mediation-requests/mediation-requests.module';
import { CasesModule } from './cases/cases.module';
import { SessionsModule } from './sessions/sessions.module';
import { SessionsService } from './sessions/sessions.service';
import { CaseInvitationsModule } from './case-invitations/case-invitations.module';
import { CaseDocumentsModule } from './case-documents/case-documents.module';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationsService } from './notifications/notifications.service';
import { NotificationsModule } from './notifications/notifications.module';
import { PushTokensModule } from './push-tokens/push-tokens.module';
import { PushNotificationsModule } from './push-notifications/push-notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    HealthModule,
    MediationRequestsModule,
    CasesModule,
    SessionsModule,
    CaseInvitationsModule,
    CaseDocumentsModule,
    NotificationsModule,
    PushTokensModule,
    PushNotificationsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class AppModule {}