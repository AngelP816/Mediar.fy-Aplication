import { api } from './api.service';

import type {
  AppNotification,
  MarkAllNotificationsResponse,
  UnreadNotificationCount,
} from '../types/notification.types';

export const notificationsService = {
  async getMine(): Promise<
    AppNotification[]
  > {
    const response =
      await api.get<AppNotification[]>(
        '/notifications/mine',
      );

    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response =
      await api.get<UnreadNotificationCount>(
        '/notifications/unread-count',
      );

    return response.data.count;
  },

  async markAsRead(
    notificationId: string,
  ): Promise<AppNotification> {
    const response =
      await api.patch<AppNotification>(
        `/notifications/${notificationId}/read`,
      );

    return response.data;
  },

  async markAllAsRead(): Promise<number> {
    const response =
      await api.patch<MarkAllNotificationsResponse>(
        '/notifications/read-all',
      );

    return response.data.updated;
  },

  async archive(
    notificationId: string,
  ): Promise<AppNotification> {
    const response =
      await api.patch<AppNotification>(
        `/notifications/${notificationId}/archive`,
      );

    return response.data;
  },
};