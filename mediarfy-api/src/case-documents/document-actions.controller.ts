import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { CaseDocumentsService } from './case-documents.service';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';
import {
  caseDocumentFileFilter,
  caseDocumentStorage,
} from './storage/case-document-storage';

@ApiTags('Documentos de casos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentActionsController {
  constructor(private readonly caseDocumentsService: CaseDocumentsService) {}

  @Post(':documentId/versions')
  @ApiOperation({
    summary: 'Subir una nueva versión de un documento',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        notes: {
          type: 'string',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Nueva versión creada correctamente',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: caseDocumentStorage,
      fileFilter: caseDocumentFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  createVersion(
    @Param('documentId', ParseUUIDPipe)
    documentId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    dto: CreateDocumentVersionDto,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    return this.caseDocumentsService.createVersion(
      documentId,
      currentUser,
      dto,
      file,
    );
  }

  @Get(':documentId/versions')
  @ApiOperation({
    summary: 'Consultar versiones de un documento',
  })
  @ApiOkResponse({
    description: 'Versiones obtenidas correctamente',
  })
  findVersions(
    @Param('documentId', ParseUUIDPipe)
    documentId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.caseDocumentsService.findVersions(documentId, currentUser);
  }

  @Get('versions/:versionId/download')
  @ApiOperation({
    summary: 'Descargar una versión de un documento',
  })
  async downloadVersion(
    @Param('versionId', ParseUUIDPipe)
    versionId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Res()
    response: Response,
  ) {
    const file = await this.caseDocumentsService.getVersionFile(
      versionId,
      currentUser,
    );

    response.type(file.mimeType);

    return response.download(file.absolutePath, file.originalName);
  }

  @Get('versions/:versionId/preview')
  @ApiOperation({
    summary: 'Visualizar una versión de documento',
  })
  async previewVersion(
    @Param('versionId', ParseUUIDPipe)
    versionId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Res({ passthrough: true })
    response: Response,
  ) {
    const file = await this.caseDocumentsService.getVersionFile(
      versionId,
      currentUser,
    );

    response.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(
        file.originalName,
      )}"`,
      'Cache-Control': 'private, no-store, max-age=0',
    });

    return new StreamableFile(createReadStream(file.absolutePath));
  }

  @Patch(':documentId/archive')
@ApiOperation({
  summary: 'Archivar un documento',
})
archive(
  @Param(
    'documentId',
    ParseUUIDPipe,
  )
  documentId: string,
  @CurrentUser()
  currentUser: AuthenticatedUser,
) {
  return this.caseDocumentsService.archive(
    documentId,
    currentUser,
  );
}

@Patch(':documentId/restore')
@ApiOperation({
  summary:
    'Restaurar un documento archivado',
})
restore(
  @Param(
    'documentId',
    ParseUUIDPipe,
  )
  documentId: string,
  @CurrentUser()
  currentUser: AuthenticatedUser,
) {
  return this.caseDocumentsService.restore(
    documentId,
    currentUser,
  );
}

@Delete(':documentId')
@ApiOperation({
  summary:
    'Eliminar lógicamente un documento',
})
remove(
  @Param(
    'documentId',
    ParseUUIDPipe,
  )
  documentId: string,
  @CurrentUser()
  currentUser: AuthenticatedUser,
) {
  return this.caseDocumentsService.remove(
    documentId,
    currentUser,
  );
}
}
