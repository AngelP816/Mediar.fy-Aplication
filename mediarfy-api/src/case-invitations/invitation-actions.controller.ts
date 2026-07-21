import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CaseInvitationsService } from './case-invitations.service';

@ApiTags('Mis invitaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationActionsController {
  constructor(
    private readonly caseInvitationsService: CaseInvitationsService,
  ) {}

  @Get('mine')
  @ApiOperation({
    summary: 'Consultar las invitaciones del usuario autenticado',
  })
  @ApiOkResponse({
    description: 'Invitaciones obtenidas correctamente',
  })
  findMine(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.caseInvitationsService.findMine(
      currentUser,
    );
  }

  @Patch(':id/accept')
  @ApiOperation({
    summary: 'Aceptar una invitación de caso',
  })
  @ApiOkResponse({
    description: 'Invitación aceptada correctamente',
  })
  accept(
    @Param('id', ParseUUIDPipe)
    invitationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.caseInvitationsService.accept(
      invitationId,
      currentUser,
    );
  }

  @Patch(':id/reject')
  @ApiOperation({
    summary: 'Rechazar una invitación de caso',
  })
  @ApiOkResponse({
    description: 'Invitación rechazada correctamente',
  })
  reject(
    @Param('id', ParseUUIDPipe)
    invitationId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.caseInvitationsService.reject(
      invitationId,
      currentUser,
    );
  }
}