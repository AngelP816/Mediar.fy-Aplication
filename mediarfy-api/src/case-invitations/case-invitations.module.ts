import { Module } from '@nestjs/common';

import { CaseInvitationsController } from './case-invitations.controller';
import { CaseInvitationsService } from './case-invitations.service';
import { InvitationActionsController } from './invitation-actions.controller';

@Module({
  controllers: [
    CaseInvitationsController,
    InvitationActionsController,
  ],
  providers: [
    CaseInvitationsService,
  ],
  exports: [
    CaseInvitationsService,
  ],
})
export class CaseInvitationsModule {}