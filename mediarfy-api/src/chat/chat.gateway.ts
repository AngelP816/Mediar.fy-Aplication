import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';

import { JwtService } from '@nestjs/jwt';

import type { Namespace, Socket } from 'socket.io';

import type {
  AuthenticatedUser,
  JwtPayload,
} from '../auth/interfaces/jwt-payload.interface';

import { ChatService } from './chat.service';

interface AuthenticatedChatSocket extends Socket {
  data: {
    user?: AuthenticatedUser;
  };
}

interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

interface MarkConversationReadPayload {
  conversationId: string;
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  }),
)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private readonly server: Namespace;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: AuthenticatedChatSocket): Promise<void> {
    try {
      const token = this.extractAccessToken(client);

      if (!token) {
        client.emit('chat:error', {
          message: 'Token de autenticación no proporcionado',
        });

        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      await client.join(this.getUserRoom(payload.sub));

      this.logger.log(`Usuario ${payload.sub} conectado al chat`);

      client.emit('chat:connected', {
        userId: payload.sub,
      });
    } catch (error) {
      this.logger.warn(
        `Conexión de chat rechazada: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      client.emit('chat:error', {
        message: 'La sesión del chat no es válida o expiró',
      });

      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedChatSocket): void {
    const userId = client.data.user?.userId;

    if (userId) {
      this.logger.log(`Usuario ${userId} desconectado del chat`);
    }
  }

  @SubscribeMessage('chat:join')
  async joinConversation(
    @ConnectedSocket()
    client: AuthenticatedChatSocket,

    @MessageBody()
    payload: JoinConversationPayload,
  ) {
    const currentUser = this.getAuthenticatedUser(client);

    const conversationId = this.validateConversationId(payload?.conversationId);

    await this.chatService.validateSocketConversationAccess(
      conversationId,
      currentUser,
    );

    await client.join(this.getConversationRoom(conversationId));

    return {
      success: true,
      conversationId,
    };
  }

  @SubscribeMessage('chat:leave')
  async leaveConversation(
    @ConnectedSocket()
    client: AuthenticatedChatSocket,

    @MessageBody()
    payload: JoinConversationPayload,
  ) {
    const conversationId = this.validateConversationId(payload?.conversationId);

    await client.leave(this.getConversationRoom(conversationId));

    return {
      success: true,
      conversationId,
    };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket()
    client: AuthenticatedChatSocket,

    @MessageBody()
    payload: SendMessagePayload,
  ) {
    const currentUser = this.getAuthenticatedUser(client);

    const conversationId = this.validateConversationId(payload?.conversationId);

    const content =
      typeof payload?.content === 'string' ? payload.content.trim() : '';

    if (!content) {
      throw new WsException('El mensaje no puede estar vacío');
    }

    if (content.length > 4000) {
      throw new WsException('El mensaje no puede superar los 4000 caracteres');
    }

    const message = await this.chatService.sendSocketMessage(
      conversationId,
      content,
      currentUser,
    );

    this.server
      .to(this.getConversationRoom(conversationId))
      .emit('message:created', message);

    return {
      success: true,
      message,
    };
  }

  @SubscribeMessage('conversation:read')
  async markConversationAsRead(
    @ConnectedSocket()
    client: AuthenticatedChatSocket,

    @MessageBody()
    payload: MarkConversationReadPayload,
  ) {
    const currentUser = this.getAuthenticatedUser(client);

    const conversationId = this.validateConversationId(payload?.conversationId);

    const result = await this.chatService.markAsRead(
      conversationId,
      currentUser,
    );

    this.server
      .to(this.getConversationRoom(conversationId))
      .emit('conversation:read', {
        conversationId,
        userId: currentUser.userId,
        readAt: result.readAt,
      });

    return {
      success: true,
      ...result,
    };
  }

  private extractAccessToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token;

    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const authorization = client.handshake.headers.authorization;

    if (
      typeof authorization === 'string' &&
      authorization.startsWith('Bearer ')
    ) {
      return authorization.slice(7);
    }

    return null;
  }

  private getAuthenticatedUser(
    client: AuthenticatedChatSocket,
  ): AuthenticatedUser {
    const currentUser = client.data.user;

    if (!currentUser) {
      throw new WsException('Usuario no autenticado');
    }

    return currentUser;
  }

  private validateConversationId(conversationId: unknown): string {
    if (typeof conversationId !== 'string' || !conversationId.trim()) {
      throw new WsException(
        'El identificador de la conversación es obligatorio',
      );
    }

    return conversationId.trim();
  }

  private getConversationRoom(conversationId: string): string {
    return `chat:conversation:${conversationId}`;
  }

  private getUserRoom(userId: string): string {
    return `chat:user:${userId}`;
  }
}
