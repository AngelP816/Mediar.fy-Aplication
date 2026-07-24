import {
  io,
  Socket,
} from 'socket.io-client';

import * as SecureStore from 'expo-secure-store';

import type {
  AppNotification,
} from '../types/notification.types';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

const ACCESS_TOKEN_KEY =
  'accessToken';

interface NotificationSocketEvents {
  onNotification?: (
    notification: AppNotification,
  ) => void;

  onUnreadCount?: (
    count: number,
  ) => void;

  onConnected?: () => void;

  onDisconnected?: () => void;

  onError?: (
    error: Error,
  ) => void;
}

let socket: Socket | null = null;

function getSocketBaseUrl(): string {
  if (!API_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL no está configurada',
    );
  }

  return API_URL.replace(
    /\/api\/v1\/?$/,
    '',
  );
}

export async function connectNotificationsSocket(
  events: NotificationSocketEvents,
): Promise<Socket> {
  if (socket?.connected) {
    return socket;
  }

  const token =
    await SecureStore.getItemAsync(
      ACCESS_TOKEN_KEY,
    );

  if (!token) {
    throw new Error(
      'No existe una sesión activa',
    );
  }

  socket = io(
    `${getSocketBaseUrl()}/notifications`,
    {
      auth: {
        token,
      },

      transports: [
        'websocket',
        'polling',
      ],

      reconnection: true,
      reconnectionAttempts:
        Infinity,
      reconnectionDelay: 1000,
      timeout: 15000,
    },
  );

  socket.on('connect', () => {
    events.onConnected?.();
  });

  socket.on(
    'notification:created',
    (
      notification:
        AppNotification,
    ) => {
      events.onNotification?.(
        notification,
      );
    },
  );

  socket.on(
    'notification:unread-count',
    (payload: {
      count: number;
    }) => {
      events.onUnreadCount?.(
        payload.count,
      );
    },
  );

  socket.on(
    'disconnect',
    () => {
      events.onDisconnected?.();
    },
  );

  socket.on(
    'connect_error',
    (error) => {
      console.log(
        'Error conectando WebSocket:',
        error.message,
      );

      events.onError?.(error);
    },
  );

  return socket;
}

export function disconnectNotificationsSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}   