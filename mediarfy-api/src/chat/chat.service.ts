import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CaseParticipantRole,
  CaseDocumentStatus,
  ChatConversationStatus,
  ChatMessageType,
  NotificationType,
  Role,
} from '../generated/prisma/enums';

import { Prisma, type ChatConversation } from '../generated/prisma/client';

import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { PrismaService } from '../prisma/prisma.service';

import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatPresenceService } from './chat-presence.service';
import { CaseDocumentsService } from '../case-documents/case-documents.service';
import { ShareChatDocumentDto } from './dto/share-chat-document.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatPresenceService: ChatPresenceService,
    private readonly caseDocumentsService: CaseDocumentsService,
  ) {}

  async findConversations(
    currentUser: AuthenticatedUser,
    limit = 50,
    offset = 0,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'El límite debe ser un número entero entre 1 y 100',
      );
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException(
        'El desplazamiento debe ser un número entero mayor o igual a 0',
      );
    }

    const page = await this.prisma.$queryRaw<
      Array<{
        id: string;
        unreadCount: number;
      }>
    >(Prisma.sql`
      SELECT
        conversation."id",
        (
          SELECT COUNT(*)::integer
          FROM "chat_messages" unread_message
          WHERE
            unread_message."conversationId" = conversation."id"
            AND unread_message."senderId" <> ${currentUser.userId}
            AND (
              participant."lastReadAt" IS NULL
              OR unread_message."createdAt" > participant."lastReadAt"
            )
        ) AS "unreadCount"
      FROM "chat_conversations" conversation
      INNER JOIN "chat_participants" participant
        ON participant."conversationId" = conversation."id"
        AND participant."userId" = ${currentUser.userId}
        AND participant."isActive" = true
      LEFT JOIN LATERAL (
        SELECT message."createdAt"
        FROM "chat_messages" message
        WHERE message."conversationId" = conversation."id"
        ORDER BY message."createdAt" DESC, message."id" DESC
        LIMIT 1
      ) last_message ON true
      WHERE conversation."status" <> ${ChatConversationStatus.ARCHIVED}::"ChatConversationStatus"
      ORDER BY
        COALESCE(last_message."createdAt", conversation."updatedAt") DESC,
        conversation."id" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    if (page.length === 0) {
      return [];
    }

    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        id: {
          in: page.map((item) => item.id),
        },
      },
      include: {
        ...this.conversationInclude,
        messages: {
          orderBy: [
            {
              createdAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          take: 1,
          include: this.messageInclude,
        },
      },
    });

    const conversationsById = new Map(
      conversations.map((conversation) => [conversation.id, conversation]),
    );

    return page.flatMap((item) => {
      const conversation = conversationsById.get(item.id);

      if (!conversation) {
        return [];
      }

      const { messages, ...summary } = conversation;

      return [
        {
          ...summary,
          lastMessage: messages[0] ?? null,
          unreadCount: item.unreadCount,
        },
      ];
    });
  }

  async getOrCreateCaseConversation(
    caseId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.validateCaseAccess(caseId, currentUser);

    const existingConversation = await this.prisma.chatConversation.findUnique({
      where: {
        caseId,
      },
      include: this.conversationInclude,
    });

    if (existingConversation) {
      await this.synchronizeParticipants(existingConversation.id, caseId);

      return this.findConversationById(existingConversation.id, currentUser);
    }

    const participantUserIds = await this.getCaseParticipantUserIds(caseId);

    const conversation = await this.prisma.chatConversation.create({
      data: {
        caseId,
        participants: {
          create: participantUserIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: this.conversationInclude,
    });

    return conversation;
  }

  async findConversationById(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.validateConversationAccess(conversationId, currentUser);

    const conversation = await this.prisma.chatConversation.findUnique({
      where: {
        id: conversationId,
      },
      include: this.conversationInclude,
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    return conversation;
  }

  async findMessages(
    conversationId: string,
    currentUser: AuthenticatedUser,
    limit = 50,
    before?: string,
  ) {
    await this.validateConversationAccess(conversationId, currentUser);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'El límite debe ser un entero entre 1 y 100',
      );
    }

    let beforeDate: Date | undefined;

    if (before) {
      beforeDate = new Date(before);

      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestException(
          'El parámetro before no contiene una fecha válida',
        );
      }
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        ...(beforeDate
          ? {
              createdAt: {
                lt: beforeDate,
              },
            }
          : {}),
      },
      include: this.messageInclude,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      take: limit,
    });

    return {
      messages: messages.reverse(),
      hasMore: messages.length === limit,
      nextBefore:
        messages.length > 0 ? messages[0].createdAt.toISOString() : null,
    };
  }

  async sendMessage(
    conversationId: string,
    dto: SendChatMessageDto,
    currentUser: AuthenticatedUser,
  ) {
    const conversation = await this.validateConversationAccess(
      conversationId,
      currentUser,
    );

    if (conversation.status !== ChatConversationStatus.ACTIVE) {
      throw new BadRequestException('La conversación no está activa');
    }

    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('El mensaje no puede estar vacío');
    }

    const message = await this.prisma.$transaction(async (transaction) => {
      const lockedConversation = await transaction.$queryRaw<
        Array<{ status: ChatConversationStatus }>
      >(Prisma.sql`
        SELECT "status"
        FROM "chat_conversations"
        WHERE "id" = ${conversationId}
        FOR UPDATE
      `);

      if (
        lockedConversation[0]?.status !== ChatConversationStatus.ACTIVE
      ) {
        throw new BadRequestException('La conversaciÃ³n no estÃ¡ activa');
      }

      const createdMessage = await transaction.chatMessage.create({
        data: {
          conversationId,
          senderId: currentUser.userId,
          type: ChatMessageType.TEXT,
          content,
        },
        include: this.messageInclude,
      });

      await transaction.chatParticipant.updateMany({
        where: {
          conversationId,
          userId: currentUser.userId,
          isActive: true,
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      return createdMessage;
    });

    await this.notifyMessageRecipients(
      conversationId,
      message.id,
      content,
      currentUser,
    );

    return message;
  }

  async shareDocument(
    conversationId: string,
    dto: ShareChatDocumentDto,
    currentUser: AuthenticatedUser,
  ) {
    const conversation = await this.validateConversationAccess(
      conversationId,
      currentUser,
    );

    if (conversation.status !== ChatConversationStatus.ACTIVE) {
      throw new BadRequestException('La conversaciÃ³n no estÃ¡ activa');
    }

    const document = await this.caseDocumentsService.findAccessibleForChat(
      dto.documentId,
      conversation.caseId,
      currentUser,
    );
    const content =
      dto.content?.trim() || `Compartió el documento "${document.name}".`;

    const message = await this.prisma.$transaction(async (transaction) => {
      const lockedConversation = await transaction.$queryRaw<
        Array<{ status: ChatConversationStatus; caseId: string }>
      >(Prisma.sql`
        SELECT "status", "caseId"
        FROM "chat_conversations"
        WHERE "id" = ${conversationId}
        FOR UPDATE
      `);
      const currentConversation = lockedConversation[0];

      if (
        !currentConversation ||
        currentConversation.status !== ChatConversationStatus.ACTIVE
      ) {
        throw new BadRequestException('La conversaciÃ³n no estÃ¡ activa');
      }

      const lockedDocument = await transaction.$queryRaw<
        Array<{ id: string; status: CaseDocumentStatus }>
      >(Prisma.sql`
        SELECT "id", "status"
        FROM "case_documents"
        WHERE
          "id" = ${dto.documentId}
          AND "caseId" = ${currentConversation.caseId}
        FOR SHARE
      `);

      if (
        !lockedDocument[0] ||
        lockedDocument[0].status === CaseDocumentStatus.DELETED
      ) {
        throw new NotFoundException(
          'Documento no encontrado o no pertenece a este caso',
        );
      }

      const createdMessage = await transaction.chatMessage.create({
        data: {
          conversationId,
          senderId: currentUser.userId,
          documentId: dto.documentId,
          type: ChatMessageType.DOCUMENT,
          content,
        },
        include: this.messageInclude,
      });

      await transaction.chatParticipant.updateMany({
        where: {
          conversationId,
          userId: currentUser.userId,
          isActive: true,
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      return createdMessage;
    });

    await this.notifyMessageRecipients(
      conversationId,
      message.id,
      content,
      currentUser,
      dto.documentId,
    );

    return message;
  }

  async markAsRead(conversationId: string, currentUser: AuthenticatedUser) {
    await this.validateConversationAccess(conversationId, currentUser);

    const now = new Date();

    const result = await this.prisma.chatParticipant.updateMany({
      where: {
        conversationId,
        userId: currentUser.userId,
        isActive: true,
      },
      data: {
        lastReadAt: now,
      },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Participante del chat no encontrado');
    }

    return {
      readAt: now,
    };
  }

  async countUnread(conversationId: string, currentUser: AuthenticatedUser) {
    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUser.userId,
        isActive: true,
      },
      select: {
        lastReadAt: true,
      },
    });

    if (!participant) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    const count = await this.prisma.chatMessage.count({
      where: {
        conversationId,
        senderId: {
          not: currentUser.userId,
        },
        createdAt: participant.lastReadAt
          ? {
              gt: participant.lastReadAt,
            }
          : undefined,
      },
    });

    return {
      count,
    };
  }

  private async validateCaseAccess(
    caseId: string,
    currentUser: AuthenticatedUser,
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
          where: {
            userId: {
              not: null,
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso no encontrado');
    }

    if (currentUser.role === Role.ADMIN) {
      return mediationCase;
    }

    if (
      currentUser.role === Role.MEDIATOR &&
      mediationCase.mediatorId === currentUser.userId
    ) {
      return mediationCase;
    }

    if (
      currentUser.role === Role.CLIENT &&
      mediationCase.clientId === currentUser.userId
    ) {
      return mediationCase;
    }

    const isParticipant = mediationCase.participants.some(
      (participant) => participant.userId === currentUser.userId,
    );

    if (currentUser.role === Role.CLIENT && isParticipant) {
      return mediationCase;
    }

    throw new ForbiddenException('No tienes acceso al chat de este caso');
  }

  private async validateConversationAccess(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ChatConversation> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    if (currentUser.role === Role.ADMIN) {
      return conversation;
    }

    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        conversationId,
        userId: currentUser.userId,
        isActive: true,
      },
    });

    if (!participant) {
      throw new ForbiddenException('No tienes acceso a esta conversación');
    }

    return conversation;
  }

  private async synchronizeParticipants(
    conversationId: string,
    caseId: string,
  ): Promise<void> {
    const authorizedUserIds = await this.getCaseParticipantUserIds(caseId);

    if (authorizedUserIds.length === 0) {
      return;
    }

    await this.prisma.$transaction(
      authorizedUserIds.map((userId) =>
        this.prisma.chatParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
          update: {
            isActive: true,
            leftAt: null,
          },
          create: {
            conversationId,
            userId,
          },
        }),
      ),
    );
  }

  private async getCaseParticipantUserIds(caseId: string): Promise<string[]> {
    const mediationCase = await this.prisma.mediationCase.findUnique({
      where: {
        id: caseId,
      },
      select: {
        clientId: true,
        mediatorId: true,
        participants: {
          where: {
            userId: {
              not: null,
            },
          },
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso no encontrado');
    }

    const userIds = new Set<string>();

    userIds.add(mediationCase.clientId);
    userIds.add(mediationCase.mediatorId);

    mediationCase.participants.forEach((participant) => {
      if (participant.userId && this.isChatParticipantRole(participant.role)) {
        userIds.add(participant.userId);
      }
    });

    return [...userIds];
  }

  private isChatParticipantRole(role: CaseParticipantRole): boolean {
    const allowedRoles = new Set<CaseParticipantRole>([
      CaseParticipantRole.REQUESTING_PARTY,
      CaseParticipantRole.INVITED_PARTY,
      CaseParticipantRole.LEGAL_REPRESENTATIVE,
      CaseParticipantRole.LAWYER,
    ]);

    return allowedRoles.has(role);
  }

  private readonly conversationInclude = {
    case: {
      select: {
        id: true,
        folio: true,
        title: true,
        status: true,
      },
    },
    participants: {
      where: {
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        joinedAt: true,
        lastReadAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    },
  } as const;

  private readonly messageInclude = {
    sender: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    },
    document: {
      include: {
        versions: {
          orderBy: {
            versionNumber: 'desc' as const,
          },
          take: 1,
        },
      },
    },
  } as const;

  async validateSocketConversationAccess(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ) {
    return this.validateConversationAccess(conversationId, currentUser);
  }

  async sendSocketMessage(
    conversationId: string,
    content: string,
    currentUser: AuthenticatedUser,
  ) {
    return this.sendMessage(
      conversationId,
      {
        content,
      },
      currentUser,
    );
  }

  async getConversationParticipantUserIds(
    conversationId: string,
  ): Promise<string[]> {
    const participants = await this.prisma.chatParticipant.findMany({
      where: {
        conversationId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    return participants.map((participant) => participant.userId);
  }

  /**
   * Reapertura deliberadamente manual: los cambios posteriores del estado del
   * caso nunca reactivan una conversación cerrada de forma automática.
   * Se mantiene sin endpoint hasta definir el flujo administrativo y auditoría.
   */
  async reopenConversationAdministratively(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ) {
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede reabrir una conversaciÃ³n',
      );
    }

    const result = await this.prisma.chatConversation.updateMany({
      where: {
        id: conversationId,
        status: ChatConversationStatus.CLOSED,
      },
      data: {
        status: ChatConversationStatus.ACTIVE,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'La conversaciÃ³n no existe o no se encuentra cerrada',
      );
    }

    return this.prisma.chatConversation.findUniqueOrThrow({
      where: {
        id: conversationId,
      },
      include: this.conversationInclude,
    });
  }

  private async notifyMessageRecipients(
    conversationId: string,
    messageId: string,
    content: string,
    currentUser: AuthenticatedUser,
    documentId?: string,
  ): Promise<void> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        caseId: true,
        case: {
          select: {
            folio: true,
            title: true,
          },
        },
        participants: {
          where: {
            isActive: true,
            userId: {
              not: currentUser.userId,
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    if (!conversation) {
      return;
    }

    const recipientUserIds = [
      ...new Set(
        conversation.participants
          .map((participant) => participant.userId)
          .filter(
            (userId) =>
              !this.chatPresenceService.isUserViewingConversation(
                userId,
                conversationId,
              ),
          ),
      ),
    ];

    if (recipientUserIds.length === 0) {
      return;
    }

    const preview = content.length > 80 ? `${content.slice(0, 80)}…` : content;

    await this.notificationsService.createMany(
      recipientUserIds.map((userId) => ({
        userId,
        type: NotificationType.CHAT_MESSAGE_RECEIVED,
        title: `Nuevo mensaje en ${conversation.case.folio}`,
        message: preview,
        caseId: conversation.caseId,
        conversationId,
        messageId,
        documentId,
      })),
    );
  }
  async countAllUnread(currentUser: AuthenticatedUser) {
    const participations = await this.prisma.chatParticipant.findMany({
      where: {
        userId: currentUser.userId,
        isActive: true,
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    let count = 0;

    for (const participant of participations) {
      count += await this.prisma.chatMessage.count({
        where: {
          conversationId: participant.conversationId,

          senderId: {
            not: currentUser.userId,
          },

          createdAt: participant.lastReadAt
            ? {
                gt: participant.lastReadAt,
              }
            : undefined,
        },
      });
    }

    return {
      count,
    };
  }
}
