import {
  BadRequestException,
  ConflictException,
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
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { RescheduleSessionDto } from './dto/reschedule-session.dto';
import { NotificationsService } from '../notifications/notifications.service';

import { NotificationType } from '../generated/prisma/enums';

@Injectable()
export class SessionsService {
  private readonly allowedTransitions: Record<SessionStatus, SessionStatus[]> =
    {
      [SessionStatus.SCHEDULED]: [
        SessionStatus.CONFIRMED,
        SessionStatus.CANCELLED,
        SessionStatus.NO_SHOW,
        SessionStatus.RESCHEDULED,
      ],

      [SessionStatus.CONFIRMED]: [
        SessionStatus.COMPLETED,
        SessionStatus.CANCELLED,
        SessionStatus.NO_SHOW,
        SessionStatus.RESCHEDULED,
      ],

      [SessionStatus.RESCHEDULED]: [
        SessionStatus.CONFIRMED,
        SessionStatus.CANCELLED,
        SessionStatus.NO_SHOW,
      ],

      [SessionStatus.COMPLETED]: [],
      [SessionStatus.CANCELLED]: [],
      [SessionStatus.NO_SHOW]: [],
    };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    caseId: string,
    currentUser: AuthenticatedUser,
    dto: CreateSessionDto,
  ) {
    const mediationCase = await this.prisma.mediationCase.findFirst({
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
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const isAssignedMediator = mediationCase.mediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para programar sesiones en este caso',
      );
    }

    const scheduledAt = new Date(dto.scheduledAt);

    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'La fecha de la sesión debe ser válida y futura',
      );
    }

    if (dto.modality === SessionModality.IN_PERSON && !dto.location?.trim()) {
      throw new BadRequestException(
        'Las sesiones presenciales requieren una ubicación',
      );
    }

    if (dto.modality === SessionModality.VIRTUAL && !dto.meetingUrl?.trim()) {
      throw new BadRequestException(
        'Las sesiones virtuales requieren un enlace',
      );
    }

    if (
      dto.modality === SessionModality.HYBRID &&
      (!dto.location?.trim() || !dto.meetingUrl?.trim())
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

    const session = await this.prisma.$transaction(async (transaction) => {
      const session = await transaction.mediationSession.create({
        data: {
          caseId,
          createdById: currentUser.userId,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          scheduledAt,
          durationMinutes: dto.durationMinutes ?? 60,
          modality: dto.modality,
          status: SessionStatus.SCHEDULED,
          location: dto.location?.trim() || null,
          meetingUrl: dto.meetingUrl?.trim() || null,
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

      if (mediationCase.status !== CaseStatus.SESSION_SCHEDULED) {
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
            toStatus: CaseStatus.SESSION_SCHEDULED,
            comment: 'Se programó una sesión de mediación',
          },
        });
      }

      return session;
    });

    await this.notifySessionUsers(
      session.caseId,
      NotificationType.SESSION_CREATED,
      'Nueva sesión programada',
      `Se programó la sesión "${session.title}" para ${session.scheduledAt.toLocaleString(
        'es-MX',
      )}.`,
      session.id,
    );

    return session;
  }

  async findByCase(caseId: string, currentUser: AuthenticatedUser) {
    const mediationCase = await this.prisma.mediationCase.findFirst({
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
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const hasAccess =
      currentUser.role === Role.ADMIN ||
      mediationCase.clientId === currentUser.userId ||
      mediationCase.mediatorId === currentUser.userId ||
      mediationCase.participants.some(
        (participant) => participant.userId === currentUser.userId,
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

  async updateStatus(
    sessionId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateSessionStatusDto,
  ) {
    const session = await this.prisma.mediationSession.findFirst({
      where: {
        id: sessionId,
      },
      include: {
        mediationCase: {
          select: {
            id: true,
            status: true,
            mediatorId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session || session.mediationCase.deletedAt) {
      throw new NotFoundException('Sesión de mediación no encontrada');
    }

    const isAssignedMediator =
      session.mediationCase.mediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta sesión',
      );
    }

    if (session.status === dto.status) {
      throw new ConflictException(
        'La sesión ya se encuentra en el estado seleccionado',
      );
    }

    const allowedStatuses = this.allowedTransitions[session.status];

    if (!allowedStatuses.includes(dto.status)) {
      throw new ConflictException(
        `No se permite cambiar la sesión de ${session.status} a ${dto.status}`,
      );
    }

    const updatedSession = await this.prisma.$transaction(
      async (transaction) => {
        const updated = await transaction.mediationSession.updateMany({
          where: {
            id: sessionId,
            status: session.status,
          },
          data: {
            status: dto.status,
            cancelledAt:
              dto.status === SessionStatus.CANCELLED ? new Date() : null,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'La sesión fue modificada por otro usuario',
          );
        }

        const updatedSession =
          await transaction.mediationSession.findUniqueOrThrow({
            where: {
              id: sessionId,
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
          dto.status === SessionStatus.COMPLETED &&
          session.mediationCase.status === CaseStatus.SESSION_SCHEDULED
        ) {
          await transaction.mediationCase.update({
            where: {
              id: session.mediationCase.id,
            },
            data: {
              status: CaseStatus.IN_MEDIATION,
            },
          });

          await transaction.caseStatusHistory.create({
            data: {
              caseId: session.mediationCase.id,
              changedById: currentUser.userId,
              fromStatus: CaseStatus.SESSION_SCHEDULED,
              toStatus: CaseStatus.IN_MEDIATION,
              comment:
                dto.comment?.trim() ||
                'La sesión fue completada y el caso inició la mediación',
            },
          });
        }

        return updatedSession;
      },
    );

    await this.notifySessionUsers(
      updatedSession.caseId,
      NotificationType.SESSION_STATUS_CHANGED,
      'Estado de sesión actualizado',
      `La sesión "${updatedSession.title}" cambió a ${updatedSession.status}.`,
      updatedSession.id,
    );

    return updatedSession;
  }

  async reschedule(
    sessionId: string,
    currentUser: AuthenticatedUser,
    dto: RescheduleSessionDto,
  ) {
    const session = await this.prisma.mediationSession.findFirst({
      where: {
        id: sessionId,
      },
      include: {
        mediationCase: {
          select: {
            id: true,
            mediatorId: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session || session.mediationCase.deletedAt) {
      throw new NotFoundException('Sesión de mediación no encontrada');
    }

    const isAssignedMediator =
      session.mediationCase.mediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para reprogramar esta sesión',
      );
    }

    const nonEditableStatuses: SessionStatus[] = [
      SessionStatus.COMPLETED,
      SessionStatus.CANCELLED,
      SessionStatus.NO_SHOW,
    ];

    if (nonEditableStatuses.includes(session.status)) {
      throw new ConflictException('La sesión ya no puede ser reprogramada');
    }

    const newScheduledAt = new Date(dto.scheduledAt);

    if (
      Number.isNaN(newScheduledAt.getTime()) ||
      newScheduledAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('La nueva fecha debe ser válida y futura');
    }

    if (newScheduledAt.getTime() === session.scheduledAt.getTime()) {
      throw new ConflictException(
        'La nueva fecha debe ser diferente a la actual',
      );
    }

    const updatedSession = await this.prisma.$transaction(
      async (transaction) => {
        const updated = await transaction.mediationSession.updateMany({
          where: {
            id: sessionId,
            status: session.status,
            scheduledAt: session.scheduledAt,
          },
          data: {
            scheduledAt: newScheduledAt,
            durationMinutes: dto.durationMinutes ?? session.durationMinutes,
            status: SessionStatus.RESCHEDULED,
            cancelledAt: null,
            notes: dto.comment?.trim() || session.notes,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'La sesión fue modificada por otro usuario',
          );
        }

        return transaction.mediationSession.findUniqueOrThrow({
          where: {
            id: sessionId,
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
      },
    );

    await this.notifySessionUsers(
      updatedSession.caseId,
      NotificationType.SESSION_RESCHEDULED,
      'Sesión reprogramada',
      `La sesión "${updatedSession.title}" fue reprogramada para ${updatedSession.scheduledAt.toLocaleString(
        'es-MX',
      )}.`,
      updatedSession.id,
    );

    return updatedSession;
  }

  private async notifySessionUsers(
    caseId: string,
    type: NotificationType,
    title: string,
    message: string,
    sessionId: string,
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

    await this.notificationsService.createMany(
      Array.from(userIds).map((userId) => ({
        userId,
        type,
        title,
        message,
        caseId,
        sessionId,
      })),
    );
  }
}
