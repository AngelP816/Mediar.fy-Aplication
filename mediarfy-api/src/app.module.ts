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
  ],
})
export class AppModule {}