import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
}