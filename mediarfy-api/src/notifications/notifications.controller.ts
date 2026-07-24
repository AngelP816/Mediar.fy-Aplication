import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { NotificationsService } from './notifications.service';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('mine')
  @ApiOperation({
    summary: 'Consultar mis notificaciones',
  })
  @ApiOkResponse({
    description: 'Notificaciones obtenidas correctamente',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 100,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    example: 0,
  })
  findMine(
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe)
    limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe)
    offset: number,
  ) {
    return this.notificationsService.findMine(currentUser, limit, offset);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Consultar cantidad de notificaciones no leídas',
  })
  countUnread(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.notificationsService.countUnread(currentUser);
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Marcar todas las notificaciones como leídas',
  })
  markAllAsRead(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.notificationsService.markAllAsRead(currentUser);
  }

  @Patch(':notificationId/read')
  @ApiOperation({
    summary: 'Marcar una notificación como leída',
  })
  markAsRead(
    @Param('notificationId', ParseUUIDPipe)
    notificationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.notificationsService.markAsRead(notificationId, currentUser);
  }

  @Patch(':notificationId/archive')
  @ApiOperation({
    summary: 'Archivar una notificación',
  })
  archive(
    @Param('notificationId', ParseUUIDPipe)
    notificationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.notificationsService.archive(notificationId, currentUser);
  }
}
