import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CasesModule } from '../cases/cases.module';
import { MediationRequestsController } from './mediation-requests.controller';
import { MediationRequestsService } from './mediation-requests.service';

@Module({
  imports: [
    AuthModule,
    CasesModule,
  ],
  controllers: [MediationRequestsController],
  providers: [MediationRequestsService],
  exports: [MediationRequestsService],
})
export class MediationRequestsModule {}