import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  CaseParticipantRole,
  CaseStatus,
  ChatConversationStatus,
  ChatMessageType,
  Role,
} from '../generated/prisma/enums';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { NotificationsService } from '../notifications/notifications.service';

import { NotificationType } from '../generated/prisma/enums';
import {
  ChatGateway,
  type ConversationStatusChangedPayload,
} from '../chat/chat.gateway';

@Injectable()
export class CasesService {
  private readonly allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
    [CaseStatus.OPEN]: [
      CaseStatus.INFORMATION_PENDING,
      CaseStatus.SESSION_SCHEDULED,
      CaseStatus.CANCELLED,
    ],

    [CaseStatus.INFORMATION_PENDING]: [
      CaseStatus.SESSION_SCHEDULED,
      CaseStatus.CANCELLED,
    ],

    [CaseStatus.SESSION_SCHEDULED]: [
      CaseStatus.IN_MEDIATION,
      CaseStatus.INFORMATION_PENDING,
      CaseStatus.CANCELLED,
    ],

    [CaseStatus.IN_MEDIATION]: [
      CaseStatus.AGREEMENT_DRAFTING,
      CaseStatus.CLOSED_NO_AGREEMENT,
      CaseStatus.CANCELLED,
    ],

    [CaseStatus.AGREEMENT_DRAFTING]: [
      CaseStatus.AWAITING_SIGNATURES,
      CaseStatus.IN_MEDIATION,
      CaseStatus.CLOSED_NO_AGREEMENT,
    ],

    [CaseStatus.AWAITING_SIGNATURES]: [
      CaseStatus.SIGNED,
      CaseStatus.AGREEMENT_DRAFTING,
      CaseStatus.CLOSED_NO_AGREEMENT,
    ],

    [CaseStatus.SIGNED]: [CaseStatus.REGISTRATION_PENDING],

    [CaseStatus.REGISTRATION_PENDING]: [CaseStatus.CLOSED_SUCCESS],

    [CaseStatus.CLOSED_SUCCESS]: [],

    [CaseStatus.CLOSED_NO_AGREEMENT]: [],

    [CaseStatus.CANCELLED]: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  generateFolio(): string {
    const year = new Date().getFullYear();

    const randomPart = randomBytes(4).toString('hex').toUpperCase();

    return `CAS-${year}-${randomPart}`;
  }

  async findMine(currentUser: AuthenticatedUser) {
    return this.prisma.mediationCase.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            clientId: currentUser.userId,
          },
          {
            mediatorId: currentUser.userId,
          },
          {
            participants: {
              some: {
                userId: currentUser.userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        folio: true,
        title: true,
        description: true,
        status: true,
        openedAt: true,
        closedAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        mediator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(caseId: string, currentUser: AuthenticatedUser) {
    const mediationCase = await this.prisma.mediationCase.findFirst({
      where: {
        id: caseId,
        deletedAt: null,
      },
      include: {
        request: {
          select: {
            id: true,
            folio: true,
            type: true,
            urgency: true,
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        mediator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        participants: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const isClient = mediationCase.clientId === currentUser.userId;

    const isMediator = mediationCase.mediatorId === currentUser.userId;

    const isParticipant = mediationCase.participants.some(
      (participant) => participant.userId === currentUser.userId,
    );

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isClient && !isMediator && !isParticipant && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para consultar este caso',
      );
    }

    return mediationCase;
  }

  async updateStatus(
    caseId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateCaseStatusDto,
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
        clientId: true,
        closedAt: true,
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const isAssignedMediator = mediationCase.mediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este caso',
      );
    }

    if (mediationCase.status === dto.status) {
      throw new ConflictException(
        'El caso ya se encuentra en el estado seleccionado',
      );
    }

    const allowedStatuses = this.allowedTransitions[mediationCase.status];

    const isTransitionAllowed = allowedStatuses.includes(dto.status);

    if (!isTransitionAllowed) {
      throw new ConflictException(
        `No se permite cambiar el caso de ${mediationCase.status} a ${dto.status}`,
      );
    }

    const finalStatuses: CaseStatus[] = [
      CaseStatus.CLOSED_SUCCESS,
      CaseStatus.CLOSED_NO_AGREEMENT,
      CaseStatus.CANCELLED,
    ];

    const shouldCloseCase = finalStatuses.includes(dto.status);

    const { updatedCase, closedConversation } =
      await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.mediationCase.updateMany({
        where: {
          id: caseId,
          status: mediationCase.status,
          deletedAt: null,
        },
        data: {
          status: dto.status,
          closedAt: shouldCloseCase ? new Date() : null,
        },
      });

      /*
       * Evita que dos operaciones cambien el estado
       * simultáneamente usando un estado anterior.
       */
      if (updated.count !== 1) {
        throw new ConflictException(
          'El estado del caso fue modificado por otro usuario',
        );
      }

      await transaction.caseStatusHistory.create({
        data: {
          caseId,
          changedById: currentUser.userId,
          fromStatus: mediationCase.status,
          toStatus: dto.status,
          comment:
            dto.comment?.trim() || this.getDefaultStatusComment(dto.status),
        },
      });

      let closedConversation:
        | {
            event: ConversationStatusChangedPayload;
            participantUserIds: string[];
            systemMessage: Awaited<
              ReturnType<typeof transaction.chatMessage.create>
            > & { sender: null };
          }
        | null = null;

      if (shouldCloseCase) {
        const conversation = await transaction.chatConversation.findUnique({
          where: {
            caseId,
          },
          select: {
            id: true,
            status: true,
            participants: {
              where: {
                isActive: true,
              },
              select: {
                userId: true,
              },
            },
          },
        });

        if (
          conversation &&
          conversation.status !== ChatConversationStatus.CLOSED
        ) {
          const closed = await transaction.chatConversation.update({
            where: {
              id: conversation.id,
            },
            data: {
              status: ChatConversationStatus.CLOSED,
            },
            select: {
              updatedAt: true,
            },
          });

          const systemMessage = await transaction.chatMessage.create({
            data: {
              conversationId: conversation.id,
              senderId: null,
              type: ChatMessageType.SYSTEM,
              content:
                'La conversación fue cerrada porque el caso finalizó.',
            },
            include: {
              sender: true,
            },
          });

          closedConversation = {
            event: {
              conversationId: conversation.id,
              caseId,
              status: ChatConversationStatus.CLOSED,
              changedAt: closed.updatedAt,
            },
            participantUserIds: conversation.participants.map(
              (participant) => participant.userId,
            ),
            systemMessage: {
              ...systemMessage,
              sender: null,
            },
          };
        }
      }

      const updatedCase = await transaction.mediationCase.findUniqueOrThrow({
        where: {
          id: caseId,
        },
        include: {
          request: {
            select: {
              id: true,
              folio: true,
              type: true,
              urgency: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          mediator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          participants: {
            orderBy: {
              createdAt: 'asc',
            },
          },
          statusHistory: {
            include: {
              changedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      return {
        updatedCase,
        closedConversation,
      };
    });

    if (closedConversation) {
      this.chatGateway.emitConversationStatusChanged(
        closedConversation.event,
        closedConversation.participantUserIds,
        closedConversation.systemMessage,
      );
    }

    await this.notifyCaseUsers(
      updatedCase.id,
      NotificationType.CASE_STATUS_CHANGED,
      'Estado del caso actualizado',
      `El caso ${updatedCase.folio} cambió a ${updatedCase.status}.`,
      {
        previousStatus: mediationCase.status,
        newStatus: updatedCase.status,
        folio: updatedCase.folio,
      },
    );

    return updatedCase;
  }

  private async notifyCaseUsers(
    caseId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, string | number | boolean | null>,
  ) {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: {
        id: caseId,
      },
      select: {
        id: true,
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

    const userIds = new Set<string>();

    userIds.add(mediationCase.clientId);
    userIds.add(mediationCase.mediatorId);

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
        metadata,
      })),
    );
  }

  private getDefaultStatusComment(status: CaseStatus): string {
    const comments: Record<CaseStatus, string> = {
      [CaseStatus.OPEN]: 'El caso fue abierto',

      [CaseStatus.INFORMATION_PENDING]: 'Se solicitó información adicional',

      [CaseStatus.SESSION_SCHEDULED]: 'Se programó una sesión de mediación',

      [CaseStatus.IN_MEDIATION]: 'El caso inició el proceso de mediación',

      [CaseStatus.AGREEMENT_DRAFTING]: 'Comenzó la redacción del convenio',

      [CaseStatus.AWAITING_SIGNATURES]: 'El convenio está pendiente de firmas',

      [CaseStatus.SIGNED]: 'El convenio fue firmado',

      [CaseStatus.REGISTRATION_PENDING]:
        'El convenio está pendiente de registro',

      [CaseStatus.CLOSED_SUCCESS]: 'El caso fue cerrado con acuerdo',

      [CaseStatus.CLOSED_NO_AGREEMENT]: 'El caso fue cerrado sin acuerdo',

      [CaseStatus.CANCELLED]: 'El caso fue cancelado',
    };

    return comments[status];
  }

  getInitialStatus(): CaseStatus {
    return CaseStatus.OPEN;
  }

  getClientParticipantRole(): CaseParticipantRole {
    return CaseParticipantRole.REQUESTING_PARTY;
  }

  getMediatorParticipantRole(): CaseParticipantRole {
    return CaseParticipantRole.MEDIATOR;
  }
}
