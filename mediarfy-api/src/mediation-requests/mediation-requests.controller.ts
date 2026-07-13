import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "../generated/prisma/enums";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CreateMediationRequestDto } from "./dto/create-mediation-request.dto";
import { MediationRequestsService } from "./mediation-requests.service";
import { DecideMediationRequestDto } from "./dto/decide-mediation-request.dto";

@ApiTags("Solicitudes de mediación")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("mediation-requests")
export class MediationRequestsController {
  constructor(private readonly service: MediationRequestsService) {}

  @Post()
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: "Crear y enviar una solicitud de mediación",
  })
  @ApiCreatedResponse({
    description: "Solicitud creada correctamente",
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMediationRequestDto,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get("mine")
  @Roles(Role.CLIENT)
  @ApiOperation({
    summary: "Consultar las solicitudes del cliente autenticado",
  })
  @ApiOkResponse({
    description: "Listado de solicitudes del cliente",
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMyRequests(user.userId);
  }

  @Get("pending")
  @Roles(Role.MEDIATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Consultar solicitudes disponibles o en revisión",
  })
  @ApiOkResponse({
    description: "Listado de solicitudes pendientes de atención",
  })
  findPending() {
    return this.service.findPendingRequests();
  }

  @Patch(":id/start-review")
  @Roles(Role.MEDIATOR)
  @ApiOperation({
    summary: "Tomar una solicitud para revisión",
  })
  @ApiOkResponse({
    description: "Solicitud asignada al mediador",
  })
  startReview(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.startReview(id, user.userId);
  }

  @Patch(":id/decision")
  @Roles(Role.MEDIATOR, Role.ADMIN)
  @ApiOperation({
    summary: "Aceptar o rechazar una solicitud",
  })
  @ApiOkResponse({
    description: "Decisión registrada correctamente",
  })
  decide(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DecideMediationRequestDto,
  ) {
    return this.service.decide(id, user, dto);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Consultar el detalle de una solicitud",
  })
  @ApiOkResponse({
    description: "Detalle de la solicitud",
  })
  @ApiNotFoundResponse({
    description: "Solicitud no encontrada",
  })
  @ApiForbiddenResponse({
    description: "El usuario no tiene acceso a la solicitud",
  })
  findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }
}
