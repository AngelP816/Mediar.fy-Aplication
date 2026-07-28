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
  ChatConversationStatusChangedEvent,
  ChatConversationSummary,
  ChatMessage,
  ChatReadEvent,
} from "../types/chat.types";
import { useAuthStore } from "./auth.store";

interface ChatState {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  conversations: ChatConversationSummary[];

  isLoading: boolean;
  isLoadingMore: boolean;
  isSending: boolean;
  isConnected: boolean;
  isLoadingConversations: boolean;
  isLoadingMoreConversations: boolean;

  hasMore: boolean;
  nextBefore: string | null;
  error: string | null;
  conversationsError: string | null;
  hasMoreConversations: boolean;

  unreadCount: number;

  loadUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;

  loadConversations: () => Promise<void>;

  loadMoreConversations: () => Promise<void>;

  openCaseChat: (caseId: string) => Promise<ChatConversation>;

  loadConversation: (conversationId: string) => Promise<void>;

  loadMessages: (conversationId: string) => Promise<void>;

  loadMoreMessages: () => Promise<void>;

  connectConversation: (conversationId: string) => Promise<void>;

  sendMessage: (content: string) => Promise<void>;

  shareDocument: (documentId: string, content?: string) => Promise<void>;

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

const CONVERSATIONS_PAGE_SIZE = 50;

function sortConversationSummaries(
  conversations: ChatConversationSummary[],
): ChatConversationSummary[] {
  return [...conversations].sort((first, second) => {
    const firstDate =
      first.lastMessage?.createdAt ?? first.updatedAt;
    const secondDate =
      second.lastMessage?.createdAt ?? second.updatedAt;

    const dateDifference =
      new Date(secondDate).getTime() - new Date(firstDate).getTime();

    return dateDifference || second.id.localeCompare(first.id);
  });
}

function updateConversationSummaries(
  conversations: ChatConversationSummary[],
  message: ChatMessage,
  currentUserId: string | undefined,
  activeConversationId: string | undefined,
): ChatConversationSummary[] {
  return sortConversationSummaries(
    conversations.map((conversation) => {
      if (conversation.id !== message.conversationId) {
        return conversation;
      }

      const shouldIncrementUnread =
        message.type !== "SYSTEM" &&
        message.senderId !== currentUserId &&
        message.conversationId !== activeConversationId;

      return {
        ...conversation,
        updatedAt: message.createdAt,
        lastMessage: message,
        unreadCount: shouldIncrementUnread
          ? conversation.unreadCount + 1
          : conversation.unreadCount,
      };
    }),
  );
}

function applyConversationStatusChanged(
  state: Pick<ChatState, "conversation" | "conversations">,
  event: ChatConversationStatusChangedEvent,
) {
  return {
    conversation:
      state.conversation?.id === event.conversationId
        ? {
            ...state.conversation,
            status: event.status,
            updatedAt: event.changedAt,
          }
        : state.conversation,
    conversations: state.conversations.map((conversation) =>
      conversation.id === event.conversationId
        ? {
            ...conversation,
            status: event.status,
            updatedAt: event.changedAt,
          }
        : conversation,
    ),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversation: null,
  messages: [],
  conversations: [],

  isLoading: false,
  isLoadingMore: false,
  isSending: false,
  isConnected: false,
  isLoadingConversations: false,
  isLoadingMoreConversations: false,
  unreadCount: 0,

  hasMore: false,
  nextBefore: null,
  error: null,
  conversationsError: null,
  hasMoreConversations: false,

  loadConversations: async () => {
    if (get().isLoadingConversations) {
      return;
    }

    set({
      isLoadingConversations: true,
      conversationsError: null,
      conversations: [],
      hasMoreConversations: false,
    });

    try {
      const conversations = await chatService.getConversations({
        limit: CONVERSATIONS_PAGE_SIZE,
        offset: 0,
      });

      set({
        conversations,
        hasMoreConversations:
          conversations.length === CONVERSATIONS_PAGE_SIZE,
      });

      const socket = await connectChatSocket();

      socket.off("message:created");
      socket.off("conversation:status-changed");

      socket.on("message:created", (message) => {
        const currentUserId = useAuthStore.getState().user?.id;
        const activeConversationId = get().conversation?.id;
        const isUnread =
          message.type !== "SYSTEM" &&
          message.senderId !== currentUserId &&
          message.conversationId !== activeConversationId;

        set((state) => ({
          conversations: updateConversationSummaries(
            state.conversations,
            message,
            currentUserId,
            activeConversationId,
          ),
          unreadCount: isUnread
            ? state.unreadCount + 1
            : state.unreadCount,
        }));
      });

      socket.on(
        "conversation:status-changed",
        (event: ChatConversationStatusChangedEvent) => {
          set((state) => applyConversationStatusChanged(state, event));
        },
      );
    } catch (error) {
      set({
        conversationsError:
          error instanceof Error
            ? error.message
            : "No fue posible cargar las conversaciones",
      });

    } finally {
      set({
        isLoadingConversations: false,
      });
    }
  },

  loadMoreConversations: async () => {
    const {
      conversations,
      hasMoreConversations,
      isLoadingMoreConversations,
    } = get();

    if (!hasMoreConversations || isLoadingMoreConversations) {
      return;
    }

    set({
      isLoadingMoreConversations: true,
      conversationsError: null,
    });

    try {
      const nextPage = await chatService.getConversations({
        limit: CONVERSATIONS_PAGE_SIZE,
        offset: conversations.length,
      });

      set((state) => {
        const existingIds = new Set(
          state.conversations.map((conversation) => conversation.id),
        );

        return {
          conversations: [
            ...state.conversations,
            ...nextPage.filter(
              (conversation) => !existingIds.has(conversation.id),
            ),
          ],
          hasMoreConversations:
            nextPage.length === CONVERSATIONS_PAGE_SIZE,
        };
      });
    } catch (error) {
      set({
        conversationsError:
          error instanceof Error
            ? error.message
            : "No fue posible cargar más conversaciones",
      });
    } finally {
      set({
        isLoadingMoreConversations: false,
      });
    }
  },

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

    socket.off("conversation:status-changed");

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
      const currentUserId = useAuthStore.getState().user?.id;
      const activeConversationId = get().conversation?.id;
      const isActiveConversation =
        message.conversationId === activeConversationId;
      const shouldIncrementUnread =
        message.type !== "SYSTEM" &&
        message.senderId !== currentUserId &&
        !isActiveConversation;

      set((state) => ({
        messages: isActiveConversation
          ? addMessageWithoutDuplicates(state.messages, message)
          : state.messages,
        conversations: updateConversationSummaries(
          state.conversations,
          message,
          currentUserId,
          activeConversationId,
        ),
        unreadCount: shouldIncrementUnread
          ? state.unreadCount + 1
          : state.unreadCount,
      }));

      if (isActiveConversation && message.senderId !== currentUserId) {
        void chatService
          .markAsRead(message.conversationId)
          .then(() => {
            emitConversationRead(message.conversationId);
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

    socket.on(
      "conversation:status-changed",
      (event: ChatConversationStatusChangedEvent) => {
        set((state) => applyConversationStatusChanged(state, event));
      },
    );

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

    if (conversation.status !== "ACTIVE") {
      const closedMessage =
        "Esta conversación está cerrada y ya no admite mensajes.";

      set({
        error: closedMessage,
      });

      throw new Error(closedMessage);
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

  shareDocument: async (documentId, content) => {
    const conversation = get().conversation;

    if (!conversation || conversation.status !== "ACTIVE") {
      throw new Error(
        "Esta conversación está cerrada y no admite documentos.",
      );
    }

    set({
      isSending: true,
      error: null,
    });

    try {
      const message = await chatService.shareDocument(
        conversation.id,
        documentId,
        content?.trim() || undefined,
      );

      set((state) => ({
        messages: addMessageWithoutDuplicates(state.messages, message),
        conversations: updateConversationSummaries(
          state.conversations,
          message,
          useAuthStore.getState().user?.id,
          state.conversation?.id,
        ),
      }));
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "No fue posible compartir el documento",
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

      set((state) => {
        const summary = state.conversations.find(
          (item) => item.id === conversation.id,
        );

        return {
          conversations: state.conversations.map((item) =>
            item.id === conversation.id
              ? {
                  ...item,
                  unreadCount: 0,
                }
              : item,
          ),
          unreadCount: Math.max(
            0,
            state.unreadCount - (summary?.unreadCount ?? 0),
          ),
        };
      });

      const count = await chatService.getAllUnreadCount();

      set({ unreadCount: count });
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

    socket?.off("conversation:read");

    socket?.off("conversation:status-changed");

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

  loadUnreadCount: async () => {
    try {
      const count = await chatService.getAllUnreadCount();

      set({
        unreadCount: count,
      });
    } catch (error) {
      console.log("No fue posible cargar los mensajes no leídos:", error);
    }
  },

  setUnreadCount: (count) => {
    set({
      unreadCount: Math.max(0, count),
    });
  },
}));
