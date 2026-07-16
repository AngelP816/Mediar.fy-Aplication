import {
  Body,
  Controller,
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
import { RescheduleSessionDto } from './dto/reschedule-session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('Sesiones de mediación')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionActionsController {
  constructor(
    private readonly sessionsService: SessionsService,
  ) {}

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
    return this.sessionsService.reschedule(
      id,
      currentUser,
      dto,
    );
  }
}