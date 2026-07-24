import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import {
  Server,
  Socket,
} from 'socket.io';

import type {
  Notification,
} from '../generated/prisma/client';

interface SocketAuthPayload {
  token?: string;
}

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
  transports: [
    'websocket',
    'polling',
  ],
})
export class NotificationsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(
    client: Socket,
  ): Promise<void> {
    try {
      const auth =
        client.handshake
          .auth as SocketAuthPayload;

      const authorizationHeader =
        client.handshake.headers
          .authorization;

      const token =
        auth?.token ??
        this.extractBearerToken(
          authorizationHeader,
        );

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload =
        await this.jwtService.verifyAsync<{
          sub: string;
          role: string;
        }>(token);

      client.data.userId = payload.sub;
      client.data.role = payload.role;

      await client.join(
        this.getUserRoom(payload.sub),
      );

      client.emit('notifications:connected', {
        connected: true,
      });
    } catch (error) {
      console.log(
        'Conexión WebSocket rechazada:',
        error,
      );

      client.disconnect(true);
    }
  }

  handleDisconnect(
    client: Socket,
  ): void {
    console.log(
      'WebSocket desconectado:',
      client.id,
    );
  }

  emitNotification(
    notification: Notification,
  ): void {
    this.server
      .to(
        this.getUserRoom(
          notification.userId,
        ),
      )
      .emit(
        'notification:created',
        notification,
      );
  }

  emitUnreadCount(
    userId: string,
    count: number,
  ): void {
    this.server
      .to(this.getUserRoom(userId))
      .emit(
        'notification:unread-count',
        {
          count,
        },
      );
  }

  private getUserRoom(
    userId: string,
  ): string {
    return `user:${userId}`;
  }

  private extractBearerToken(
    authorization?: string,
  ): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [
      type,
      token,
    ] = authorization.split(' ');

    if (
      type !== 'Bearer' ||
      !token
    ) {
      return undefined;
    }

    return token;
  }
}