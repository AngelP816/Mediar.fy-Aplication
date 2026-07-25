import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { Notification } from '../generated/prisma/client';
import {
  NotificationStatus,
  NotificationType,
} from '../generated/prisma/enums';

import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { PushNotificationsService } from '../push-notifications/push-notifications.service';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;

  caseId?: string;
  sessionId?: string;
  invitationId?: string;
  documentId?: string;

  metadata?: Record<string, string | number | boolean | null>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushNotificationsService: PushNotificationsService,
  ) {}

  async create(data: CreateNotificationData) {
    const notification = await this.prisma.notification.create({
      data: this.toCreateData(data),
    });

    await this.emitRealtimeUpdates([notification]);

    return notification;
  }

  async createMany(notifications: CreateNotificationData[]) {
    if (notifications.length === 0) {
      return {
        count: 0,
      };
    }

    const createdNotifications =
      await this.prisma.notification.createManyAndReturn({
        data: notifications.map((notification) =>
          this.toCreateData(notification),
        ),
      });

    await this.emitRealtimeUpdates(createdNotifications);

    return {
      count: createdNotifications.length,
    };
  }

  async findMine(currentUser: AuthenticatedUser, limit = 100, offset = 0) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'El límite debe ser un número entero entre 1 y 100',
      );
    }

    if (!Number.isInteger(offset) || offset < 0) {
      throw new BadRequestException(
        'El desplazamiento debe ser un número entero mayor o igual a 0',
      );
    }

    return this.prisma.notification.findMany({
      where: {
        userId: currentUser.userId,
        status: {
          not: NotificationStatus.ARCHIVED,
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip: offset,
    });
  }

  async countUnread(currentUser: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: {
        userId: currentUser.userId,
        status: NotificationStatus.UNREAD,
      },
    });

    return {
      count,
    };
  }

  async markAsRead(notificationId: string, currentUser: AuthenticatedUser) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: currentUser.userId,
        status: {
          not: NotificationStatus.ARCHIVED,
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notification.id,
        userId: currentUser.userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      const currentNotification = await this.prisma.notification.findFirst({
        where: {
          id: notification.id,
          userId: currentUser.userId,
          status: NotificationStatus.READ,
        },
      });

      if (currentNotification) {
        return currentNotification;
      }

      throw new NotFoundException('Notificación no encontrada');
    }

    const readNotification = await this.prisma.notification.findUniqueOrThrow({
      where: {
        id: notification.id,
      },
    });

    await this.emitUnreadCounts([currentUser.userId]);

    return readNotification;
  }

  async markAllAsRead(currentUser: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: currentUser.userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    await this.emitUnreadCounts([currentUser.userId]);

    return {
      updated: result.count,
    };
  }

  async archive(notificationId: string, currentUser: AuthenticatedUser) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: currentUser.userId,
        status: {
          not: NotificationStatus.ARCHIVED,
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    const updated = await this.prisma.notification.updateMany({
      where: {
        id: notification.id,
        userId: currentUser.userId,
        status: notification.status,
      },
      data: {
        status: NotificationStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new NotFoundException('Notificación no encontrada');
    }

    const archivedNotification =
      await this.prisma.notification.findUniqueOrThrow({
        where: {
          id: notification.id,
        },
      });

    await this.emitUnreadCounts([currentUser.userId]);

    return archivedNotification;
  }

  private toCreateData(data: CreateNotificationData) {
    return {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      caseId: data.caseId ?? null,
      sessionId: data.sessionId ?? null,
      invitationId: data.invitationId ?? null,
      documentId: data.documentId ?? null,
      metadata: data.metadata ?? undefined,
    };
  }

  private async emitRealtimeUpdates(
    notifications: Notification[],
  ): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    notifications.forEach((notification) => {
      try {
        this.notificationsGateway.emitNotification(notification);
      } catch (error) {
        this.logRealtimeWarning('notificación por WebSocket', error);
      }
    });

    await this.emitUnreadCounts(
      notifications.map((notification) => notification.userId),
    );

    const pushResults = await Promise.allSettled(
      notifications.map((notification) =>
        this.pushNotificationsService.sendToUser({
          userId: notification.userId,

          title: notification.title,

          body: notification.message,

          data: {
            notificationId: notification.id,

            type: notification.type,

            caseId: notification.caseId,

            sessionId: notification.sessionId,

            invitationId: notification.invitationId,

            documentId: notification.documentId,
          },
        }),
      ),
    );

    pushResults.forEach((result, index) => {
      if (result.status !== 'rejected') {
        return;
      }

      const notification = notifications[index];

      this.logger.warn(
        `No se pudo enviar la notificación push ${notification?.id ?? ''}: ${
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        }`,
      );
    });
  }

  private async emitUnreadCounts(userIds: string[]): Promise<void> {
    const uniqueUserIds = [...new Set(userIds)];

    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        try {
          const count = await this.prisma.notification.count({
            where: {
              userId,
              status: NotificationStatus.UNREAD,
            },
          });

          this.notificationsGateway.emitUnreadCount(userId, count);
        } catch (error) {
          this.logRealtimeWarning('contador', error);
        }
      }),
    );
  }

  private logRealtimeWarning(context: string, error: unknown): void {
    this.logger.warn(
      `No se pudo sincronizar ${context} en tiempo real: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
