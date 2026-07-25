import { create } from 'zustand';

import type {
  AppNotification,
} from '../types/notification.types';

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  isSocketConnected: boolean;

  setNotifications: (
    notifications: AppNotification[],
  ) => void;

  addNotification: (
    notification: AppNotification,
  ) => void;

  updateNotification: (
    notification: AppNotification,
  ) => void;

  removeNotification: (
    notificationId: string,
  ) => void;

  setUnreadCount: (
    unreadCount: number,
  ) => void;

  setSocketConnected: (
    connected: boolean,
  ) => void;

  clearNotifications: () => void;
}

export const useNotificationsStore =
  create<NotificationsState>((set) => ({
    notifications: [],
    unreadCount: 0,
    isSocketConnected: false,

    setNotifications: (
      notifications,
    ) => {
      set({
        notifications,
        unreadCount:
          notifications.filter(
            (notification) =>
              notification.status ===
              'UNREAD',
          ).length,
      });
    },

    addNotification: (
      notification,
    ) => {
      set((state) => {
        const alreadyExists =
          state.notifications.some(
            (currentNotification) =>
              currentNotification.id ===
              notification.id,
          );

        if (alreadyExists) {
          return state;
        }

        return {
          notifications: [
            notification,
            ...state.notifications,
          ],
        };
      });
    },

    updateNotification: (
      notification,
    ) => {
      set((state) => ({
        notifications:
          state.notifications.map(
            (currentNotification) =>
              currentNotification.id ===
              notification.id
                ? notification
                : currentNotification,
          ),
      }));
    },

    removeNotification: (
      notificationId,
    ) => {
      set((state) => ({
        notifications:
          state.notifications.filter(
            (notification) =>
              notification.id !==
              notificationId,
          ),
      }));
    },

    setUnreadCount: (
      unreadCount,
    ) => {
      set({
        unreadCount: Math.max(
          unreadCount,
          0,
        ),
      });
    },

    setSocketConnected: (
      connected,
    ) => {
      set({
        isSocketConnected: connected,
      });
    },

    clearNotifications: () => {
      set({
        notifications: [],
        unreadCount: 0,
        isSocketConnected: false,
      });
    },
  }));