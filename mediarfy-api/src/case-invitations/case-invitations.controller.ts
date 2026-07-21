import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CaseInvitationsService } from './case-invitations.service';
import { CreateCaseInvitationDto } from './dto/create-case-invitation.dto';

@ApiTags('Invitaciones de casos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases/:caseId/invitations')
export class CaseInvitationsController {
  constructor(
    private readonly caseInvitationsService: CaseInvitationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Crear una invitación para participar en un caso',
  })
  @ApiCreatedResponse({
    description:
      'Invitación creada correctamente',
  })
  create(
    @Param('caseId', ParseUUIDPipe)
    caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    dto: CreateCaseInvitationDto,
  ) {
    return this.caseInvitationsService.create(
      caseId,
      currentUser,
      dto,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar las invitaciones de un caso',
  })
  @ApiOkResponse({
    description:
      'Invitaciones obtenidas correctamente',
  })
  findByCase(
    @Param('caseId', ParseUUIDPipe)
    caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.caseInvitationsService.findByCase(
      caseId,
      currentUser,
    );
  }
}