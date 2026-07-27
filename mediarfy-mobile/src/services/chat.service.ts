import { api } from './api.service';

import type {
  ChatConversation,
  ChatMessage,
  ChatMessagesResponse,
  ChatReadResponse,
  ChatUnreadCountResponse,
} from '../types/chat.types';

interface FindMessagesOptions {
  limit?: number;
  before?: string;
}

export const chatService = {
  async getOrCreateCaseConversation(
    caseId: string,
  ): Promise<ChatConversation> {
    const response =
      await api.get<ChatConversation>(
        `/cases/${caseId}/chat`,
      );

    return response.data;
  },

  async getConversation(
    conversationId: string,
  ): Promise<ChatConversation> {
    const response =
      await api.get<ChatConversation>(
        `/chat/conversations/${conversationId}`,
      );

    return response.data;
  },

  async getMessages(
    conversationId: string,
    options: FindMessagesOptions = {},
  ): Promise<ChatMessagesResponse> {
    const response =
      await api.get<ChatMessagesResponse>(
        `/chat/conversations/${conversationId}/messages`,
        {
          params: {
            limit: options.limit ?? 50,
            before: options.before,
          },
        },
      );

    return response.data;
  },

  async sendMessage(
    conversationId: string,
    content: string,
  ): Promise<ChatMessage> {
    const response =
      await api.post<ChatMessage>(
        `/chat/conversations/${conversationId}/messages`,
        {
          content,
        },
      );

    return response.data;
  },

  async markAsRead(
    conversationId: string,
  ): Promise<ChatReadResponse> {
    const response =
      await api.patch<ChatReadResponse>(
        `/chat/conversations/${conversationId}/read`,
      );

    return response.data;
  },

  async getUnreadCount(
    conversationId: string,
  ): Promise<number> {
    const response =
      await api.get<ChatUnreadCountResponse>(
        `/chat/conversations/${conversationId}/unread-count`,
      );

    return response.data.count;
  },
};