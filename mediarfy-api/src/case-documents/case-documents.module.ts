import { Module } from '@nestjs/common';

import { CaseDocumentsController } from './case-documents.controller';
import { CaseDocumentsService } from './case-documents.service';
import { DocumentActionsController } from './document-actions.controller';

@Module({
  controllers: [
    CaseDocumentsController,
    DocumentActionsController,
  ],
  providers: [
    CaseDocumentsService,
  ],
  exports: [
    CaseDocumentsService,
  ],
})
export class CaseDocumentsModule {}