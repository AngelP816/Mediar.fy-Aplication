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

import { CurrentUser } from '../auth/decorators/current-user.decorator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { ChatService } from './chat.service';

import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { ShareChatDocumentDto } from './dto/share-chat-document.dto';
import { ChatGateway } from './chat.gateway';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('chat/conversations')
  findConversations(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe)
    limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe)
    offset: number,
  ) {
    return this.chatService.findConversations(currentUser, limit, offset);
  }

  @Get('cases/:caseId/chat')
  getOrCreateCaseConversation(
    @Param('caseId') caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.getOrCreateCaseConversation(caseId, currentUser);
  }

  @Get('chat/conversations/:conversationId')
  findConversation(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.findConversationById(conversationId, currentUser);
  }

  @Get('chat/conversations/:conversationId/messages')
  findMessages(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe)
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

  @Post('chat/conversations/:conversationId/messages')
  sendMessage(
    @Param('conversationId')
    conversationId: string,
    @Body()
    dto: SendChatMessageDto,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.sendMessage(conversationId, dto, currentUser);
  }

  @Post('chat/conversations/:conversationId/documents')
  async shareDocument(
    @Param('conversationId')
    conversationId: string,
    @Body()
    dto: ShareChatDocumentDto,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    const message = await this.chatService.shareDocument(
      conversationId,
      dto,
      currentUser,
    );
    const participantUserIds =
      await this.chatService.getConversationParticipantUserIds(conversationId);

    this.chatGateway.emitMessageCreated(
      message,
      conversationId,
      participantUserIds,
    );

    return message;
  }

  @Patch('chat/conversations/:conversationId/read')
  markAsRead(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.markAsRead(conversationId, currentUser);
  }

  @Get('chat/conversations/:conversationId/unread-count')
  countUnread(
    @Param('conversationId')
    conversationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.countUnread(conversationId, currentUser);
  }

  @Get('chat/unread-count')
  countAllUnread(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.chatService.countAllUnread(currentUser);
  }
}
