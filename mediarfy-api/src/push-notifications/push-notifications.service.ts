import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Expo,
  ExpoPushMessage,
  ExpoPushTicket,
} from 'expo-server-sdk';

import { PrismaService } from '../prisma/prisma.service';

interface SendPushNotificationData {
  userId: string;
  title: string;
  body: string;

  data?: Record<
    string,
    string | number | boolean | null
  >;
}

@Injectable()
export class PushNotificationsService {
  private readonly logger =
    new Logger(PushNotificationsService.name);

  private readonly expo = new Expo();

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async sendToUser(
    notification:
      SendPushNotificationData,
  ): Promise<void> {
    const storedTokens =
      await this.prisma.pushToken.findMany({
        where: {
          userId: notification.userId,
          isActive: true,
        },
        select: {
          id: true,
          token: true,
        },
      });

    if (storedTokens.length === 0) {
      return;
    }

    const validTokens =
      storedTokens.filter(({ token }) => {
        const isValid =
          Expo.isExpoPushToken(token);

        if (!isValid) {
          this.logger.warn(
            `Token push inválido: ${token}`,
          );
        }

        return isValid;
      });

    if (validTokens.length === 0) {
      return;
    }

    const messages: ExpoPushMessage[] =
      validTokens.map(({ token }) => ({
        to: token,
        sound: 'default',

        title: notification.title,
        body: notification.body,

        channelId: 'default',
        priority: 'high',

        data:
          notification.data ?? {},
      }));

    const messageChunks =
      this.expo.chunkPushNotifications(
        messages,
      );

    const tokenChunks =
      this.chunkArray(
        validTokens,
        100,
      );

    for (
      let index = 0;
      index < messageChunks.length;
      index += 1
    ) {
      const messageChunk =
        messageChunks[index];

      const tokenChunk =
        tokenChunks[index] ?? [];

      try {
        const tickets =
          await this.expo.sendPushNotificationsAsync(
            messageChunk,
          );

        await this.processTickets(
          tickets,
          tokenChunk,
        );
      } catch (error) {
        this.logger.error(
          'No fue posible enviar un lote de notificaciones push',
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }
  }

  private async processTickets(
    tickets: ExpoPushTicket[],
    tokens: {
      id: string;
      token: string;
    }[],
  ): Promise<void> {
    for (
      let index = 0;
      index < tickets.length;
      index += 1
    ) {
      const ticket = tickets[index];
      const storedToken = tokens[index];

      if (!storedToken) {
        continue;
      }

      if (ticket.status === 'ok') {
        continue;
      }

      this.logger.warn(
        `Error push para ${storedToken.token}: ${ticket.message}`,
      );

      if (
        ticket.details?.error ===
        'DeviceNotRegistered'
      ) {
        await this.prisma.pushToken.update({
          where: {
            id: storedToken.id,
          },
          data: {
            isActive: false,
          },
        });
      }
    }
  }

  private chunkArray<T>(
    values: T[],
    size: number,
  ): T[][] {
    const chunks: T[][] = [];

    for (
      let index = 0;
      index < values.length;
      index += size
    ) {
      chunks.push(
        values.slice(
          index,
          index + size,
        ),
      );
    }

    return chunks;
  }
}