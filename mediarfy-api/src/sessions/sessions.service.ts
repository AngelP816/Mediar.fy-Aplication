import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CaseStatus,
  Role,
  SessionModality,
  SessionStatus,
} from '../generated/prisma/enums';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    caseId: string,
    currentUser: AuthenticatedUser,
    dto: CreateSessionDto,
  ) {
    const mediationCase =
      await this.prisma.mediationCase.findFirst({
        where: {
          id: caseId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          mediatorId: true,
        },
      });

    if (!mediationCase) {
      throw new NotFoundException(
        'Caso de mediación no encontrado',
      );
    }

    const isAssignedMediator =
      mediationCase.mediatorId === currentUser.userId;

    const isAdmin =
      currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para programar sesiones en este caso',
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);

    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'La fecha de la sesión debe ser futura',
      );
    }

    if (
      dto.modality === SessionModality.IN_PERSON &&
      !dto.location?.trim()
    ) {
      throw new BadRequestException(
        'Las sesiones presenciales requieren una ubicación',
      );
    }

    if (
      dto.modality === SessionModality.VIRTUAL &&
      !dto.meetingUrl?.trim()
    ) {
      throw new BadRequestException(
        'Las sesiones virtuales requieren un enlace',
      );
    }

    if (
      dto.modality === SessionModality.HYBRID &&
      (!dto.location?.trim() ||
        !dto.meetingUrl?.trim())
    ) {
      throw new BadRequestException(
        'Las sesiones híbridas requieren ubicación y enlace',
      );
    }

    const finalStatuses: CaseStatus[] = [
      CaseStatus.CLOSED_SUCCESS,
      CaseStatus.CLOSED_NO_AGREEMENT,
      CaseStatus.CANCELLED,
    ];

    if (finalStatuses.includes(mediationCase.status)) {
      throw new BadRequestException(
        'No se pueden programar sesiones en un caso cerrado',
      );
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const session =
          await transaction.mediationSession.create({
            data: {
              caseId,
              createdById: currentUser.userId,
              title: dto.title.trim(),
              description:
                dto.description?.trim() || null,
              scheduledAt,
              durationMinutes:
                dto.durationMinutes ?? 60,
              modality: dto.modality,
              status: SessionStatus.SCHEDULED,
              location:
                dto.location?.trim() || null,
              meetingUrl:
                dto.meetingUrl?.trim() || null,
              notes: dto.notes?.trim() || null,
            },
            include: {
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          });

        if (
          mediationCase.status !==
          CaseStatus.SESSION_SCHEDULED
        ) {
          await transaction.mediationCase.update({
            where: {
              id: caseId,
            },
            data: {
              status: CaseStatus.SESSION_SCHEDULED,
            },
          });

          await transaction.caseStatusHistory.create({
            data: {
              caseId,
              changedById: currentUser.userId,
              fromStatus: mediationCase.status,
              toStatus:
                CaseStatus.SESSION_SCHEDULED,
              comment:
                'Se programó una sesión de mediación',
            },
          });
        }

        return session;
      },
    );
  }

  async findByCase(
    caseId: string,
    currentUser: AuthenticatedUser,
  ) {
    const mediationCase =
      await this.prisma.mediationCase.findFirst({
        where: {
          id: caseId,
          deletedAt: null,
        },
        include: {
          participants: {
            select: {
              userId: true,
            },
          },
        },
      });

    if (!mediationCase) {
      throw new NotFoundException(
        'Caso de mediación no encontrado',
      );
    }

    const hasAccess =
      currentUser.role === Role.ADMIN ||
      mediationCase.clientId === currentUser.userId ||
      mediationCase.mediatorId === currentUser.userId ||
      mediationCase.participants.some(
        (participant) =>
          participant.userId === currentUser.userId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'No tienes permiso para consultar las sesiones de este caso',
      );
    }

    return this.prisma.mediationSession.findMany({
      where: {
        caseId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }
}