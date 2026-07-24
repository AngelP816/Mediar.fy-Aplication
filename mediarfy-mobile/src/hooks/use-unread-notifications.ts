import {
  useCallback,
  useState,
} from 'react';

import {
  useFocusEffect,
} from 'expo-router';

import {
  notificationsService,
} from '../services/notifications.service';

export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] =
    useState(0);

  const refreshUnreadCount =
    useCallback(async () => {
      try {
        const count =
          await notificationsService.getUnreadCount();

        setUnreadCount(count);
      } catch (error) {
        console.log(
          'No fue posible cargar el contador de notificaciones:',
          error,
        );
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  return {
    unreadCount,
    refreshUnreadCount,
  };
}