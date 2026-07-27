import { create } from "zustand";

import { chatService } from "../services/chat.service";

import {
  connectChatSocket,
  emitConversationRead,
  getChatSocket,
  joinChatConversation,
  leaveChatConversation,
  sendChatSocketMessage,
} from "../services/chat-socket.service";

import type {
  ChatConversation,
  ChatMessage,
  ChatReadEvent,
} from "../types/chat.types";

interface ChatState {
  conversation: ChatConversation | null;
  messages: ChatMessage[];

  isLoading: boolean;
  isLoadingMore: boolean;
  isSending: boolean;
  isConnected: boolean;

  hasMore: boolean;
  nextBefore: string | null;
  error: string | null;

  openCaseChat: (caseId: string) => Promise<ChatConversation>;

  loadConversation: (conversationId: string) => Promise<void>;

  loadMessages: (conversationId: string) => Promise<void>;

  loadMoreMessages: () => Promise<void>;

  connectConversation: (conversationId: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;

  markAsRead: () => Promise<void>;

  closeConversation: () => void;

  clearError: () => void;
}

function addMessageWithoutDuplicates(
  messages: ChatMessage[],
  newMessage: ChatMessage,
): ChatMessage[] {
  const exists = messages.some((message) => message.id === newMessage.id);

  if (exists) {
    return messages;
  }

  return [...messages, newMessage].sort(
    (first, second) =>
      new Date(first.createdAt).getTime() -
      new Date(second.createdAt).getTime(),
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversation: null,
  messages: [],

  isLoading: false,
  isLoadingMore: false,
  isSending: false,
  isConnected: false,

  hasMore: false,
  nextBefore: null,
  error: null,

  openCaseChat: async (caseId) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const conversation =
        await chatService.getOrCreateCaseConversation(caseId);

      set({
        conversation,
      });

      return conversation;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No fue posible abrir el chat",
      });

      throw error;
    } finally {
      set({
        isLoading: false,
      });
    }
  },

  loadConversation: async (conversationId) => {
    set({
      isLoading: true,
      error: null,
    });

    try {
      const [conversation, messagesResponse] = await Promise.all([
        chatService.getConversation(conversationId),
        chatService.getMessages(conversationId),
      ]);

      set({
        conversation,
        messages: messagesResponse.messages,
        hasMore: messagesResponse.hasMore,
        nextBefore: messagesResponse.nextBefore,
      });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No fue posible cargar la conversación",
      });

      throw error;
    } finally {
      set({
        isLoading: false,
      });
    }
  },

  loadMessages: async (conversationId) => {
    const response = await chatService.getMessages(conversationId);

    set({
      messages: response.messages,
      hasMore: response.hasMore,
      nextBefore: response.nextBefore,
    });
  },

  loadMoreMessages: async () => {
    const { conversation, nextBefore, hasMore, isLoadingMore } = get();

    if (!conversation || !nextBefore || !hasMore || isLoadingMore) {
      return;
    }

    set({
      isLoadingMore: true,
    });

    try {
      const response = await chatService.getMessages(conversation.id, {
        before: nextBefore,
        limit: 50,
      });

      set((state) => {
        const existingIds = new Set(
          state.messages.map((message) => message.id),
        );

        const olderMessages = response.messages.filter(
          (message) => !existingIds.has(message.id),
        );

        return {
          messages: [...olderMessages, ...state.messages],
          hasMore: response.hasMore,
          nextBefore: response.nextBefore,
        };
      });
    } finally {
      set({
        isLoadingMore: false,
      });
    }
  },

  connectConversation: async (conversationId) => {
    const socket = await connectChatSocket();
    set({
      isConnected: socket.connected,
    });

    socket.off("message:created");

    socket.off("conversation:read");

    socket.off("connect");

    socket.off("disconnect");

    socket.on("connect", () => {
      set({
        isConnected: true,
      });

      void joinChatConversation(conversationId).catch((error) => {
        console.log("No fue posible volver a entrar al chat:", error);
      });
    });

    socket.on("disconnect", () => {
      set({
        isConnected: false,
      });
    });

    socket.on("message:created", (message) => {
      if (message.conversationId !== conversationId) {
        return;
      }

      set((state) => ({
        messages: addMessageWithoutDuplicates(state.messages, message),
      }));

      if (message.conversationId === conversationId) {
        void chatService
          .markAsRead(conversationId)
          .then(() => {
            emitConversationRead(conversationId);
          })
          .catch((error) => {
            console.log("No fue posible marcar el mensaje como leído:", error);
          });
      }
    });

    socket.on("conversation:read", (event: ChatReadEvent) => {
      if (event.conversationId !== conversationId) {
        return;
      }

      set((state) => {
        if (!state.conversation) {
          return {};
        }

        return {
          conversation: {
            ...state.conversation,
            participants: state.conversation.participants.map((participant) =>
              participant.userId === event.userId
                ? {
                    ...participant,
                    lastReadAt: event.readAt,
                  }
                : participant,
            ),
          },
        };
      });
    });

    await joinChatConversation(conversationId);

    set({
      isConnected: socket.connected,
    });
  },

  sendMessage: async (content) => {
    const conversation = get().conversation;

    const trimmedContent = content.trim();

    if (!conversation || !trimmedContent) {
      return;
    }

    set({
      isSending: true,
      error: null,
    });

    try {
      const message = await sendChatSocketMessage(
        conversation.id,
        trimmedContent,
      );

      /*
       * El servidor también emite message:created.
       * La función evita agregar el mismo mensaje
       * dos veces.
       */
      set((state) => ({
        messages: addMessageWithoutDuplicates(state.messages, message),
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No fue posible enviar el mensaje",
      });

      throw error;
    } finally {
      set({
        isSending: false,
      });
    }
  },

  markAsRead: async () => {
    const conversation = get().conversation;

    if (!conversation) {
      return;
    }

    try {
      await chatService.markAsRead(conversation.id);

      emitConversationRead(conversation.id);
    } catch (error) {
      console.log("No fue posible marcar el chat como leído:", error);
    }
  },

  closeConversation: () => {
    const conversation = get().conversation;

    if (conversation) {
      leaveChatConversation(conversation.id);
    }

    const socket = getChatSocket();

    socket?.off("message:created");

    socket?.off("conversation:read");

    socket?.off("connect");

    socket?.off("disconnect");

    set({
      conversation: null,
      messages: [],
      hasMore: false,
      nextBefore: null,
      isConnected: false,
      isLoading: false,
      isLoadingMore: false,
      isSending: false,
      error: null,
    });
  },

  clearError: () => {
    set({
      error: null,
    });
  },
}));
