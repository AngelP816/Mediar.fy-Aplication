import { io, type Socket } from "socket.io-client";

import { api } from "./api.service";
import { tokenStorage } from "./token-storage.service";

import type { ChatMessage, ChatReadEvent } from "../types/chat.types";

interface ServerToClientEvents {
  "chat:connected": (payload: { userId: string }) => void;

  "chat:error": (payload: { message: string }) => void;

  "message:created": (message: ChatMessage) => void;

  "conversation:read": (payload: ChatReadEvent) => void;
}

interface ClientToServerEvents {
  "chat:join": (
    payload: {
      conversationId: string;
    },
    callback?: (response: {
      success: boolean;
      conversationId?: string;
      message?: string;
    }) => void,
  ) => void;

  "chat:leave": (payload: { conversationId: string }) => void;

  "message:send": (
    payload: {
      conversationId: string;
      content: string;
    },
    callback?: (response: { success: boolean; message?: ChatMessage }) => void,
  ) => void;

  "conversation:read": (payload: { conversationId: string }) => void;
}

type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let chatSocket: ChatSocket | null = null;

function getSocketBaseUrl(): string {
  const baseUrl = api.defaults.baseURL;

  if (!baseUrl || typeof baseUrl !== "string") {
    throw new Error("No se encontró la URL base de la API");
  }

  return baseUrl.replace(/\/api\/v1\/?$/, "");
}

export async function connectChatSocket(): Promise<ChatSocket> {
  /*
   * Si el socket ya existe, lo reutilizamos aunque
   * todavía se encuentre en proceso de conexión.
   */
  if (chatSocket) {
    if (!chatSocket.connected) {
      chatSocket.connect();
    }

    return chatSocket;
  }

  const accessToken = await tokenStorage.getAccessToken();

  if (!accessToken) {
    throw new Error("No existe una sesión activa para conectar el chat");
  }

  chatSocket = io(`${getSocketBaseUrl()}/chat`, {
    transports: ["websocket"],
    auth: {
      token: accessToken,
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 10000,
    autoConnect: true,
  });

  return chatSocket;
}

export function getChatSocket(): ChatSocket | null {
  return chatSocket;
}

export function disconnectChatSocket(): void {
  if (!chatSocket) {
    return;
  }

  chatSocket.removeAllListeners();
  chatSocket.disconnect();
  chatSocket = null;
}

export async function joinChatConversation(
  conversationId: string,
): Promise<void> {
  const socket = await connectChatSocket();

  /*
   * No enviamos chat:join hasta que Socket.IO
   * haya terminado realmente la conexión.
   */
  await waitForSocketConnection(socket);

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("No fue posible entrar a la conversación"));
    }, 10000);

    socket.emit(
      "chat:join",
      {
        conversationId,
      },
      (response) => {
        clearTimeout(timeout);

        if (!response?.success) {
          reject(
            new Error(
              response?.message ?? "No fue posible entrar a la conversación",
            ),
          );

          return;
        }

        resolve();
      },
    );
  });
}
export function leaveChatConversation(conversationId: string): void {
  chatSocket?.emit("chat:leave", {
    conversationId,
  });
}

export async function sendChatSocketMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  const socket = await connectChatSocket();

  await waitForSocketConnection(socket);

  return new Promise<ChatMessage>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("No fue posible confirmar el envío del mensaje"));
    }, 10000);

    socket.emit(
      "message:send",
      {
        conversationId,
        content,
      },
      (response) => {
        clearTimeout(timeout);

        if (!response?.success || !response.message) {
          reject(new Error("No fue posible enviar el mensaje"));

          return;
        }

        resolve(response.message);
      },
    );
  });
}

export function emitConversationRead(conversationId: string): void {
  chatSocket?.emit("conversation:read", {
    conversationId,
  });
}

function waitForSocketConnection(socket: ChatSocket): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();

      reject(new Error("La conexión al chat tardó demasiado"));
    }, 10000);

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleConnectError = (error: Error) => {
      cleanup();

      reject(new Error(error.message || "No fue posible conectar con el chat"));
    };

    const cleanup = () => {
      clearTimeout(timeout);

      socket.off("connect", handleConnect);

      socket.off("connect_error", handleConnectError);
    };

    socket.once("connect", handleConnect);

    socket.once("connect_error", handleConnectError);

    socket.connect();
  });
}
