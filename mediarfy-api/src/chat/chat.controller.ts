import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  CurrentUser,
} from '../auth/decorators/current-user.decorator';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import type {
  AuthenticatedUser,
} from '../auth/interfaces/jwt-payload.interface';

import {
  ChatService,
} from './chat.service';

import {
  SendChatMessageDto,
} from './dto/send-chat-message.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Get('cases/:caseId/chat')
  getOrCreateCaseConversation(
    @Param('caseId') caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService
      .getOrCreateCaseConversation(
        caseId,
        currentUser,
      );
  }

  @Get(
    'chat/conversations/:conversationId',
  )
  findConversation(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService
      .findConversationById(
        conversationId,
        currentUser,
      );
  }

  @Get(
    'chat/conversations/:conversationId/messages',
  )
  findMessages(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Query(
      'limit',
      new DefaultValuePipe(50),
      ParseIntPipe,
    )
    limit: number,
    @Query('before')
    before?: string,
  ) {
    return this.chatService.findMessages(
      conversationId,
      currentUser,
      limit,
      before,
    );
  }

  @Post(
    'chat/conversations/:conversationId/messages',
  )
  sendMessage(
    @Param('conversationId')
    conversationId: string,
    @Body()
    dto: SendChatMessageDto,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.sendMessage(
      conversationId,
      dto,
      currentUser,
    );
  }

  @Patch(
    'chat/conversations/:conversationId/read',
  )
  markAsRead(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.markAsRead(
      conversationId,
      currentUser,
    );
  }

  @Get(
    'chat/conversations/:conversationId/unread-count',
  )
  countUnread(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.countUnread(
      conversationId,
      currentUser,
    );
  }
}