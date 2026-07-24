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
import {
  CaseDocumentStatus,
  CaseStatus,
  NotificationType,
  Role,
} from '../generated/prisma/enums';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateCaseDocumentDto } from './dto/create-case-document.dto';
import { CreateDocumentVersionDto } from './dto/create-document-version.dto';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CaseDocumentsService {
  private readonly finalCaseStatuses: CaseStatus[] = [
    CaseStatus.CLOSED_SUCCESS,
    CaseStatus.CLOSED_NO_AGREEMENT,
    CaseStatus.CANCELLED,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

    let createdDocument: Awaited<
      ReturnType<typeof this.createDocumentTransaction>
    >;

    try {
      const access = await this.verifyCaseAccess(caseId, currentUser);

      if (this.finalCaseStatuses.includes(access.mediationCase.status)) {
        throw new BadRequestException(
          'No se pueden agregar documentos a un caso finalizado',
        );
      }

      const fileContent = await readFile(file.path);

      const checksum = createHash('sha256').update(fileContent).digest('hex');

      createdDocument = await this.createDocumentTransaction(
        caseId,
        currentUser.userId,
        dto,
        file,
        checksum,
      );
    } catch (error) {
      await unlink(file.path).catch(() => undefined);

      throw error;
    }

    await this.notifyDocumentUsers(
      createdDocument.caseId,
      NotificationType.DOCUMENT_CREATED,
      'Nuevo documento',
      `Se agregó el documento "${createdDocument.name}" al expediente.`,
      createdDocument.id,
      currentUser.userId,
    );

    return createdDocument;
  }

  private createDocumentTransaction(
    caseId: string,
    uploadedById: string,
    dto: CreateCaseDocumentDto,
    file: Express.Multer.File,
    checksum: string,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const document = await transaction.caseDocument.create({
        data: {
          caseId,
          uploadedById,
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
          uploadedById,
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

    let transactionCommitted = false;

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

      if (this.finalCaseStatuses.includes(document.mediationCase.status)) {
        throw new ConflictException(
          'No se pueden agregar versiones a un caso finalizado',
        );
      }

      const fileContent = await readFile(file.path);

      const checksum = createHash('sha256').update(fileContent).digest('hex');

      const version = await this.prisma.$transaction(async (transaction) => {
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

      transactionCommitted = true;

      await this.notifyDocumentUsers(
        document.caseId,
        NotificationType.DOCUMENT_VERSION_CREATED,
        'Nueva versión de documento',
        `Se agregó una nueva versión del documento "${document.name}".`,
        document.id,
        currentUser.userId,
      );

      return version;
    } catch (error) {
      if (!transactionCommitted) {
        await unlink(file.path).catch(() => undefined);
      }

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

  async archive(documentId: string, currentUser: AuthenticatedUser) {
    const document = await this.findDocumentForManagement(
      documentId,
      currentUser,
    );

    if (document.status === CaseDocumentStatus.ARCHIVED) {
      throw new ConflictException('El documento ya se encuentra archivado');
    }

    const updated = await this.prisma.caseDocument.updateMany({
      where: {
        id: document.id,
        status: document.status,
      },
      data: {
        status: CaseDocumentStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'El documento fue modificado por otro usuario',
      );
    }

    const archivedDocument = await this.prisma.caseDocument.findUniqueOrThrow({
      where: {
        id: document.id,
      },
    });

    await this.notifyDocumentUsers(
      document.caseId,
      NotificationType.DOCUMENT_ARCHIVED,
      'Documento archivado',
      `Se archivó el documento "${document.name}".`,
      document.id,
      currentUser.userId,
    );

    return archivedDocument;
  }

  async restore(documentId: string, currentUser: AuthenticatedUser) {
    const document = await this.findDocumentForManagement(
      documentId,
      currentUser,
    );

    if (document.status !== CaseDocumentStatus.ARCHIVED) {
      throw new ConflictException('El documento no se encuentra archivado');
    }

    const updated = await this.prisma.caseDocument.updateMany({
      where: {
        id: document.id,
        status: document.status,
      },
      data: {
        status: CaseDocumentStatus.ACTIVE,
        archivedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'El documento fue modificado por otro usuario',
      );
    }

    const restoredDocument = await this.prisma.caseDocument.findUniqueOrThrow({
      where: {
        id: document.id,
      },
    });

    await this.notifyDocumentUsers(
      document.caseId,
      NotificationType.DOCUMENT_RESTORED,
      'Documento restaurado',
      `Se restauró el documento "${document.name}".`,
      document.id,
      currentUser.userId,
    );

    return restoredDocument;
  }

  async remove(documentId: string, currentUser: AuthenticatedUser) {
    const document = await this.findDocumentForManagement(
      documentId,
      currentUser,
    );

    if (document.status === CaseDocumentStatus.DELETED) {
      throw new NotFoundException('Documento no encontrado');
    }

    const updated = await this.prisma.caseDocument.updateMany({
      where: {
        id: document.id,
        status: document.status,
      },
      data: {
        status: CaseDocumentStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'El documento fue modificado por otro usuario',
      );
    }

    const deletedDocument = await this.prisma.caseDocument.findUniqueOrThrow({
      where: {
        id: document.id,
      },
    });

    await this.notifyDocumentUsers(
      document.caseId,
      NotificationType.DOCUMENT_DELETED,
      'Documento eliminado',
      `Se eliminó el documento "${document.name}".`,
      document.id,
      currentUser.userId,
    );

    return deletedDocument;
  }

  private async findDocumentForManagement(
    documentId: string,
    currentUser: AuthenticatedUser,
  ) {
    const document = await this.prisma.caseDocument.findFirst({
      where: {
        id: documentId,
        status: {
          not: CaseDocumentStatus.DELETED,
        },
        mediationCase: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        caseId: true,
        name: true,
        status: true,
        mediationCase: {
          select: {
            mediatorId: true,
            status: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    const isAdmin = currentUser.role === Role.ADMIN;

    const isAssignedMediator =
      document.mediationCase.mediatorId === currentUser.userId;

    if (!isAdmin && !isAssignedMediator) {
      throw new ForbiddenException(
        'No tienes permiso para administrar este documento',
      );
    }

    if (this.finalCaseStatuses.includes(document.mediationCase.status)) {
      throw new ConflictException(
        'No se pueden modificar documentos de un caso finalizado',
      );
    }

    return document;
  }

  private async notifyDocumentUsers(
    caseId: string,
    type: NotificationType,
    title: string,
    message: string,
    documentId: string,
    excludeUserId?: string,
  ) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: {
        id: caseId,
      },
      select: {
        clientId: true,
        mediatorId: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mediationCase) {
      return;
    }

    const userIds = new Set<string>([
      mediationCase.clientId,
      mediationCase.mediatorId,
    ]);

    mediationCase.participants.forEach((participant) => {
      if (participant.userId) {
        userIds.add(participant.userId);
      }
    });

    if (excludeUserId) {
      userIds.delete(excludeUserId);
    }

    await this.notificationsService.createMany(
      Array.from(userIds).map((userId) => ({
        userId,
        type,
        title,
        message,
        caseId,
        documentId,
      })),
    );
  }
}
