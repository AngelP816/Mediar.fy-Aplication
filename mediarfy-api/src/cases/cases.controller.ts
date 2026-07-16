import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CasesService } from './cases.service';

@ApiTags('Casos de mediación')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
  ) {}

  @Get('mine')
  @ApiOperation({
    summary:
      'Consultar los casos asociados al usuario autenticado',
  })
  @ApiOkResponse({
    description: 'Listado de casos',
  })
  findMine(
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.casesService.findMine(currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar el detalle de un caso',
  })
  @ApiOkResponse({
    description: 'Detalle del caso',
  })
  @ApiNotFoundResponse({
    description: 'Caso no encontrado',
  })
  @ApiForbiddenResponse({
    description: 'El usuario no tiene acceso al caso',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.casesService.findOne(
      id,
      currentUser,
    );
  }
  @Patch(':id/status')
@ApiOperation({
  summary:
    'Actualizar el estado de un caso de mediación',
})
@ApiOkResponse({
  description:
    'Estado del caso actualizado correctamente',
})
@ApiNotFoundResponse({
  description: 'Caso no encontrado',
})
@ApiForbiddenResponse({
  description:
    'El usuario no tiene permiso para modificar el caso',
})
@ApiConflictResponse({
  description:
    'La transición de estado no está permitida',
})
updateStatus(
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateCaseStatusDto,
  @CurrentUser()
  currentUser: AuthenticatedUser,
) {
  return this.casesService.updateStatus(
    id,
    currentUser,
    dto,
  );
}
}