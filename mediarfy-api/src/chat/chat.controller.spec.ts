import type { ChatGateway } from './chat.gateway';
import type { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}));

describe('ChatController.shareDocument', () => {
  it('emite message:created después de compartir el documento', async () => {
    const currentUser = {
      userId: 'user-1',
      email: 'user@example.com',
      role: 'CLIENT' as const,
    };
    const message = {
      id: 'message-1',
      conversationId: 'conversation-1',
      documentId: 'document-1',
      type: 'DOCUMENT',
    };
    const chatService = {
      shareDocument: jest.fn().mockResolvedValue(message),
      getConversationParticipantUserIds: jest
        .fn()
        .mockResolvedValue(['user-1', 'user-2']),
    };
    const chatGateway = {
      emitMessageCreated: jest.fn(),
    };
    const controller = new ChatController(
      chatService as unknown as ChatService,
      chatGateway as unknown as ChatGateway,
    );

    await expect(
      controller.shareDocument(
        'conversation-1',
        {
          documentId: 'document-1',
        },
        currentUser,
      ),
    ).resolves.toBe(message);
    expect(chatGateway.emitMessageCreated).toHaveBeenCalledWith(
      message,
      'conversation-1',
      ['user-1', 'user-2'],
    );
  });
});
