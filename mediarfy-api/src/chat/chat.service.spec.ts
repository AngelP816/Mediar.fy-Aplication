import { BadRequestException } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ChatPresenceService } from './chat-presence.service';

import { ChatService } from './chat.service';

jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}));

describe('ChatService conversations', () => {
  const currentUser: AuthenticatedUser = {
    userId: 'user-1',
    email: 'client@example.com',
    role: 'CLIENT',
  };

  const createService = () => {
    const prisma = {
      $queryRaw: jest.fn(),
      chatConversation: {
        findMany: jest.fn(),
      },
    };

    const service = new ChatService(
      prisma as unknown as PrismaService,
      {} as NotificationsService,
      {} as ChatPresenceService,
    );

    return {
      prisma,
      service,
    };
  };

  it.each([
    [0, 0],
    [101, 0],
    [50, -1],
  ])('rechaza limit %s y offset %s inválidos', async (limit, offset) => {
    const { service } = createService();

    await expect(
      service.findConversations(currentUser, limit, offset),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve los resúmenes en el orden calculado por la página', async () => {
    const { prisma, service } = createService();

    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'conversation-2',
        unreadCount: 3,
      },
      {
        id: 'conversation-1',
        unreadCount: 0,
      },
    ]);

    const baseConversation = {
      caseId: 'case-1',
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      case: {
        id: 'case-1',
        folio: 'MED-1',
        title: 'Caso',
        status: 'OPEN',
      },
      participants: [],
    };

    prisma.chatConversation.findMany.mockResolvedValue([
      {
        ...baseConversation,
        id: 'conversation-1',
        messages: [],
      },
      {
        ...baseConversation,
        id: 'conversation-2',
        messages: [
          {
            id: 'message-1',
            conversationId: 'conversation-2',
            senderId: 'user-2',
            type: 'TEXT',
            content: 'Mensaje reciente',
            createdAt: new Date('2026-01-03T00:00:00.000Z'),
            updatedAt: new Date('2026-01-03T00:00:00.000Z'),
            sender: {
              id: 'user-2',
              firstName: 'Ana',
              lastName: 'Pérez',
              email: 'ana@example.com',
              role: 'MEDIATOR',
            },
          },
        ],
      },
    ]);

    const result = await service.findConversations(currentUser, 50, 0);

    expect(result.map((conversation) => conversation.id)).toEqual([
      'conversation-2',
      'conversation-1',
    ]);
    expect(result[0]).toMatchObject({
      unreadCount: 3,
      lastMessage: {
        id: 'message-1',
      },
    });
    expect(result[1]).toMatchObject({
      unreadCount: 0,
      lastMessage: null,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.chatConversation.findMany).toHaveBeenCalledTimes(1);
  });

  it('evita la consulta de detalles cuando la página está vacía', async () => {
    const { prisma, service } = createService();

    prisma.$queryRaw.mockResolvedValue([]);

    await expect(
      service.findConversations(currentUser, 50, 0),
    ).resolves.toEqual([]);

    expect(prisma.chatConversation.findMany).not.toHaveBeenCalled();
  });
});
