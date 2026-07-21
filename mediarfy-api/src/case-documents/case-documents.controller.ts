import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { CaseDocumentsService } from './case-documents.service';
import { CreateCaseDocumentDto } from './dto/create-case-document.dto';
import {
  caseDocumentFileFilter,
  caseDocumentStorage,
} from './storage/case-document-storage';

@ApiTags('Documentos de casos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases/:caseId/documents')
export class CaseDocumentsController {
  constructor(
    private readonly caseDocumentsService: CaseDocumentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Subir un documento al expediente',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'file',
        'name',
        'type',
      ],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: {
          type: 'string',
          example:
            'Identificación oficial',
        },
        description: {
          type: 'string',
        },
        type: {
          type: 'string',
          enum: [
            'IDENTIFICATION',
            'PROPERTY_DOCUMENT',
            'CONTRACT',
            'REQUEST',
            'EVIDENCE',
            'AGREEMENT_DRAFT',
            'SIGNED_AGREEMENT',
            'REGISTRATION_PROOF',
            'PAYMENT_RECEIPT',
            'OTHER',
          ],
        },
        notes: {
          type: 'string',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description:
      'Documento subido correctamente',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: caseDocumentStorage,
      fileFilter:
        caseDocumentFileFilter,
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  create(
    @Param('caseId', ParseUUIDPipe)
    caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    dto: CreateCaseDocumentDto,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    return this.caseDocumentsService.create(
      caseId,
      currentUser,
      dto,
      file,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar documentos de un expediente',
  })
  @ApiOkResponse({
    description:
      'Documentos obtenidos correctamente',
  })
  findByCase(
    @Param('caseId', ParseUUIDPipe)
    caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.caseDocumentsService.findByCase(
      caseId,
      currentUser,
    );
  }
}