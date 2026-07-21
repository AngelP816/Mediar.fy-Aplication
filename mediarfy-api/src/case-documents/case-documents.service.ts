import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'path';
import { createHash } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import { CaseDocumentStatus, Role } from '../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateCaseDocumentDto } from './dto/create-case-document.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';

@Injectable()
export class CaseDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyCaseAccess(
    caseId: string,
    currentUser: AuthenticatedUser,
  ) {
    const mediationCase = await this.prisma.mediationCase.findFirst({
      where: {
        id: caseId,
        deletedAt: null,
      },
      select: {
        id: true,
        clientId: true,
        mediatorId: true,
        status: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const isAdmin = currentUser.role === Role.ADMIN;

    const isClient = mediationCase.clientId === currentUser.userId;

    const isMediator = mediationCase.mediatorId === currentUser.userId;

    const isParticipant = mediationCase.participants.some(
      (participant) => participant.userId === currentUser.userId,
    );

    if (!isAdmin && !isClient && !isMediator && !isParticipant) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a los documentos de este caso',
      );
    }

    return {
      mediationCase,
      isAdmin,
      isClient,
      isMediator,
      isParticipant,
    };
  }

  async create(
    caseId: string,
    currentUser: AuthenticatedUser,
    dto: CreateCaseDocumentDto,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    try {
      const access = await this.verifyCaseAccess(caseId, currentUser);

      const finalStatuses = [
        'CLOSED_SUCCESS',
        'CLOSED_NO_AGREEMENT',
        'CANCELLED',
      ];

      if (finalStatuses.includes(access.mediationCase.status)) {
        throw new BadRequestException(
          'No se pueden agregar documentos a un caso finalizado',
        );
      }

      const fileContent = await readFile(file.path);

      const checksum = createHash('sha256').update(fileContent).digest('hex');

      return await this.prisma.$transaction(async (transaction) => {
        const document = await transaction.caseDocument.create({
          data: {
            caseId,
            uploadedById: currentUser.userId,
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
            type: dto.type,
            status: CaseDocumentStatus.ACTIVE,
            currentVersion: 1,
          },
        });

        const version = await transaction.caseDocumentVersion.create({
          data: {
            documentId: document.id,
            uploadedById: currentUser.userId,
            versionNumber: 1,
            originalName: file.originalname,
            storedName: file.filename,
            storagePath: file.path,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            checksum,
            notes: dto.notes?.trim() || null,
          },
        });

        return {
          ...document,
          currentFile: version,
        };
      });
    } catch (error) {
      await unlink(file.path).catch(() => undefined);

      throw error;
    }
  }

  async findByCase(caseId: string, currentUser: AuthenticatedUser) {
    await this.verifyCaseAccess(caseId, currentUser);

    return this.prisma.caseDocument.findMany({
      where: {
        caseId,
        status: {
          not: CaseDocumentStatus.DELETED,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        versions: {
          orderBy: {
            versionNumber: 'desc',
          },
          take: 1,
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async createVersion(
    documentId: string,
    currentUser: AuthenticatedUser,
    dto: CreateDocumentVersionDto,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo');
    }

    try {
      const document = await this.prisma.caseDocument.findFirst({
        where: {
          id: documentId,
          status: {
            not: CaseDocumentStatus.DELETED,
          },
        },
        include: {
          mediationCase: {
            select: {
              id: true,
              status: true,
              deletedAt: true,
            },
          },
        },
      });

      if (!document || document.mediationCase.deletedAt) {
        throw new NotFoundException('Documento no encontrado');
      }

      const access = await this.verifyCaseAccess(document.caseId, currentUser);

      const canUploadVersion =
        access.isAdmin ||
        access.isMediator ||
        document.uploadedById === currentUser.userId;

      if (!canUploadVersion) {
        throw new ForbiddenException(
          'No tienes permiso para subir una nueva versión de este documento',
        );
      }

      const finalStatuses = [
        'CLOSED_SUCCESS',
        'CLOSED_NO_AGREEMENT',
        'CANCELLED',
      ];

      if (finalStatuses.includes(document.mediationCase.status)) {
        throw new ConflictException(
          'No se pueden agregar versiones a un caso finalizado',
        );
      }

      const fileContent = await readFile(file.path);

      const checksum = createHash('sha256').update(fileContent).digest('hex');

      return await this.prisma.$transaction(async (transaction) => {
        const currentDocument = await transaction.caseDocument.findUnique({
          where: {
            id: document.id,
          },
          select: {
            currentVersion: true,
            status: true,
          },
        });

        if (
          !currentDocument ||
          currentDocument.status === CaseDocumentStatus.DELETED
        ) {
          throw new NotFoundException('Documento no encontrado');
        }

        const nextVersion = currentDocument.currentVersion + 1;

        const updated = await transaction.caseDocument.updateMany({
          where: {
            id: document.id,
            currentVersion: currentDocument.currentVersion,
            status: {
              not: CaseDocumentStatus.DELETED,
            },
          },
          data: {
            currentVersion: nextVersion,
            status: CaseDocumentStatus.ACTIVE,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'El documento fue modificado por otro usuario',
          );
        }

        const version = await transaction.caseDocumentVersion.create({
          data: {
            documentId: document.id,
            uploadedById: currentUser.userId,
            versionNumber: nextVersion,
            originalName: file.originalname,
            storedName: file.filename,
            storagePath: file.path,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            checksum,
            notes: dto.notes?.trim() || null,
          },
          include: {
            uploadedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        return version;
      });
    } catch (error) {
      await unlink(file.path).catch(() => undefined);

      throw error;
    }
  }

  async findVersions(documentId: string, currentUser: AuthenticatedUser) {
    const document = await this.prisma.caseDocument.findFirst({
      where: {
        id: documentId,
        status: {
          not: CaseDocumentStatus.DELETED,
        },
      },
      select: {
        id: true,
        caseId: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    await this.verifyCaseAccess(document.caseId, currentUser);

    return this.prisma.caseDocumentVersion.findMany({
      where: {
        documentId,
      },
      orderBy: {
        versionNumber: 'desc',
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }

  async getVersionFile(versionId: string, currentUser: AuthenticatedUser) {
    const version = await this.prisma.caseDocumentVersion.findUnique({
      where: {
        id: versionId,
      },
      include: {
        document: {
          select: {
            id: true,
            caseId: true,
            status: true,
          },
        },
      },
    });

    if (!version || version.document.status === CaseDocumentStatus.DELETED) {
      throw new NotFoundException('Versión de documento no encontrada');
    }

    await this.verifyCaseAccess(version.document.caseId, currentUser);

    const absolutePath = join(process.cwd(), version.storagePath);

    return {
      absolutePath,
      originalName: version.originalName,
      mimeType: version.mimeType,
    };
  }
}
