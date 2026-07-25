import {
  useCallback,
  useEffect,
} from 'react';

import {
  connectNotificationsSocket,
  disconnectNotificationsSocket,
} from '../services/notifications-socket.service';

import {
  useNotificationsStore,
} from '../stores/notifications.store';

interface UseNotificationsSocketOptions {
  enabled: boolean;
}

export function useNotificationsSocket({
  enabled,
}: UseNotificationsSocketOptions) {
  const addNotification =
    useNotificationsStore(
      (state) =>
        state.addNotification,
    );

  const setUnreadCount =
    useNotificationsStore(
      (state) =>
        state.setUnreadCount,
    );

  const setSocketConnected =
    useNotificationsStore(
      (state) =>
        state.setSocketConnected,
    );

  const connectSocket =
    useCallback(async () => {
      try {
        await connectNotificationsSocket({
          onNotification: (
            notification,
          ) => {
            addNotification(
              notification,
            );
          },

          onUnreadCount: (
            count,
          ) => {
            setUnreadCount(count);
          },

          onConnected: () => {
            setSocketConnected(true);
          },

          onDisconnected: () => {
            setSocketConnected(false);
          },

          onError: (error) => {
            console.log(
              'Error del socket de notificaciones:',
              error.message,
            );

            setSocketConnected(false);
          },
        });
      } catch (error) {
        console.log(
          'No fue posible iniciar el socket:',
          error,
        );

        setSocketConnected(false);
      }
    }, [
      addNotification,
      setSocketConnected,
      setUnreadCount,
    ]);

  useEffect(() => {
    if (!enabled) {
      disconnectNotificationsSocket();
      setSocketConnected(false);
      return;
    }

    void connectSocket();

    return () => {
      disconnectNotificationsSocket();
      setSocketConnected(false);
    };
  }, [
    enabled,
    connectSocket,
    setSocketConnected,
  ]);
}