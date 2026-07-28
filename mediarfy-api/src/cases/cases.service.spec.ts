import { CaseStatus, ChatConversationStatus } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ChatGateway } from '../chat/chat.gateway';
import { CasesService } from './cases.service';

jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}));

describe('CasesService.updateStatus', () => {
  const currentUser = {
    userId: 'mediator-1',
    email: 'mediator@example.com',
    role: 'MEDIATOR' as const,
  };

  function createService(withConversation = true) {
    const closedAt = new Date('2026-07-27T12:00:00.000Z');
    const updatedCase = {
      id: 'case-1',
      folio: 'CAS-2026-TEST',
      status: CaseStatus.CANCELLED,
    };
    const transaction = {
      mediationCase: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updatedCase),
      },
      caseStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      chatConversation: {
        findUnique: jest.fn().mockResolvedValue(
          withConversation
            ? {
                id: 'conversation-1',
                status: ChatConversationStatus.ACTIVE,
                participants: [
                  { userId: 'client-1' },
                  { userId: 'mediator-1' },
                ],
              }
            : null,
        ),
        update: jest.fn().mockResolvedValue({ updatedAt: closedAt }),
      },
      chatMessage: {
        create: jest.fn().mockResolvedValue({
          id: 'message-1',
          conversationId: 'conversation-1',
          senderId: null,
          type: 'SYSTEM',
          content: 'La conversación fue cerrada porque el caso finalizó.',
          createdAt: closedAt,
          updatedAt: closedAt,
          sender: null,
        }),
      },
    };
    const prisma = {
      mediationCase: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case-1',
          status: CaseStatus.OPEN,
          mediatorId: 'mediator-1',
          clientId: 'client-1',
          closedAt: null,
        }),
        findUnique: jest.fn().mockResolvedValue({
          id: 'case-1',
          clientId: 'client-1',
          mediatorId: 'mediator-1',
          participants: [],
        }),
      },
      $transaction: jest
        .fn()
        .mockImplementation(
          (callback: (client: typeof transaction) => unknown) =>
            callback(transaction),
        ),
    };
    const notificationsService = {
      createMany: jest.fn().mockResolvedValue([]),
    };
    const chatGateway = {
      emitConversationStatusChanged: jest.fn(),
    };
    const service = new CasesService(
      prisma as unknown as PrismaService,
      notificationsService as unknown as NotificationsService,
      chatGateway as unknown as ChatGateway,
    );

    return { service, transaction, chatGateway };
  }

  it('cierra el chat existente, crea el mensaje SYSTEM y emite tras el commit', async () => {
    const { service, transaction, chatGateway } = createService();

    await service.updateStatus('case-1', currentUser, {
      status: CaseStatus.CANCELLED,
    });

    expect(transaction.chatConversation.update).toHaveBeenCalledWith({
      where: { id: 'conversation-1' },
      data: { status: ChatConversationStatus.CLOSED },
      select: { updatedAt: true },
    });
    expect(transaction.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          conversationId: 'conversation-1',
          senderId: null,
          type: 'SYSTEM',
          content: 'La conversación fue cerrada porque el caso finalizó.',
        },
      }),
    );
    expect(chatGateway.emitConversationStatusChanged).toHaveBeenCalledWith(
      {
        conversationId: 'conversation-1',
        caseId: 'case-1',
        status: ChatConversationStatus.CLOSED,
        changedAt: new Date('2026-07-27T12:00:00.000Z'),
      },
      ['client-1', 'mediator-1'],
      expect.objectContaining({ senderId: null, type: 'SYSTEM' }),
    );
  });

  it('no crea una conversación ni un mensaje si el caso nunca tuvo chat', async () => {
    const { service, transaction, chatGateway } = createService(false);

    await service.updateStatus('case-1', currentUser, {
      status: CaseStatus.CANCELLED,
    });

    expect(transaction.chatConversation.update).not.toHaveBeenCalled();
    expect(transaction.chatMessage.create).not.toHaveBeenCalled();
    expect(chatGateway.emitConversationStatusChanged).not.toHaveBeenCalled();
  });
});
