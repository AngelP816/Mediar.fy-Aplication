import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';
import { RescheduleSessionDto } from './dto/reschedule-session.dto';

@ApiTags('Sesiones de mediación')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases/:caseId/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Programar una sesión de mediación',
  })
  @ApiCreatedResponse({
    description: 'Sesión programada correctamente',
  })
  create(
    @Param('caseId', ParseUUIDPipe)
    caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    dto: CreateSessionDto,
  ) {
    return this.sessionsService.create(caseId, currentUser, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Consultar las sesiones asociadas a un caso',
  })
  @ApiOkResponse({
    description: 'Listado de sesiones',
  })
  findByCase(
    @Param('caseId', ParseUUIDPipe)
    caseId: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.sessionsService.findByCase(caseId, currentUser);
  }
  @Patch(':id/reschedule')
  @ApiOperation({
    summary: 'Reprogramar una sesión de mediación',
  })
  @ApiOkResponse({
    description: 'Sesión reprogramada correctamente',
  })
  reschedule(
    @Param('id', ParseUUIDPipe)
    id: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
    @Body()
    dto: RescheduleSessionDto,
  ) {
    return this.sessionsService.reschedule(id, currentUser, dto);
  }
}
