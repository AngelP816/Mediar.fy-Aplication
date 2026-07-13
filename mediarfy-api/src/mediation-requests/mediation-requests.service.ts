import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { MediationRequestStatus, Role, CaseParticipantRole, CaseStatus } from "../generated/prisma/enums";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/jwt-payload.interface";
import { CreateMediationRequestDto } from "./dto/create-mediation-request.dto";
import { DecideMediationRequestDto } from "./dto/decide-mediation-request.dto";
import { CasesService } from "../cases/cases.service";

@Injectable()
export class MediationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casesService: CasesService,
  ) {}

  async create(clientId: string, dto: CreateMediationRequestDto) {
    const folio = this.generateFolio();

    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.mediationRequest.create({
        data: {
          folio,
          title: dto.title.trim(),
          description: dto.description.trim(),
          type: dto.type,
          urgency: dto.urgency ?? "MEDIUM",
          status: MediationRequestStatus.SUBMITTED,
          clientId,
          submittedAt: new Date(),
        },
        select: {
          id: true,
          folio: true,
          title: true,
          description: true,
          type: true,
          urgency: true,
          status: true,
          submittedAt: true,
          createdAt: true,
        },
      });

      await transaction.requestStatusHistory.create({
        data: {
          requestId: request.id,
          changedById: clientId,
          fromStatus: null,
          toStatus: MediationRequestStatus.SUBMITTED,
          comment: "Solicitud enviada por el cliente",
        },
      });

      return request;
    });
  }

  async findMyRequests(clientId: string) {
    return this.prisma.mediationRequest.findMany({
      where: {
        clientId,
        deletedAt: null,
      },
      select: {
        id: true,
        folio: true,
        title: true,
        description: true,
        type: true,
        urgency: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        decisionAt: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        assignedMediator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findOne(requestId: string, currentUser: AuthenticatedUser) {
    const request = await this.prisma.mediationRequest.findFirst({
      where: {
        id: requestId,
        deletedAt: null,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedMediator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        statusHistory: {
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            comment: true,
            createdAt: true,
            changedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException("Solicitud de mediación no encontrada");
    }

    const isOwner = request.clientId === currentUser.userId;

    const isAssignedMediator =
      request.assignedMediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    const isAvailableForMediator =
      currentUser.role === Role.MEDIATOR &&
      request.status === MediationRequestStatus.SUBMITTED &&
      request.assignedMediatorId === null;

    if (
      !isOwner &&
      !isAssignedMediator &&
      !isAdmin &&
      !isAvailableForMediator
    ) {
      throw new ForbiddenException(
        "No tienes permiso para consultar esta solicitud",
      );
    }

    return request;
  }

  private generateFolio(): string {
    const year = new Date().getFullYear();

    const randomPart = randomBytes(4).toString("hex").toUpperCase();

    return `MED-${year}-${randomPart}`;
  }

  async findPendingRequests() {
    return this.prisma.mediationRequest.findMany({
      where: {
        status: {
          in: [
            MediationRequestStatus.SUBMITTED,
            MediationRequestStatus.UNDER_REVIEW,
          ],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        folio: true,
        title: true,
        description: true,
        type: true,
        urgency: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignedMediator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        {
          urgency: "desc",
        },
        {
          submittedAt: "asc",
        },
      ],
    });
  }

  async startReview(requestId: string, mediatorId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.mediationRequest.findFirst({
        where: {
          id: requestId,
          deletedAt: null,
        },
      });

      if (!request) {
        throw new NotFoundException("Solicitud de mediación no encontrada");
      }

      if (request.status !== MediationRequestStatus.SUBMITTED) {
        throw new ConflictException(
          "La solicitud ya no se encuentra disponible para revisión",
        );
      }

      const updated = await transaction.mediationRequest.updateMany({
        where: {
          id: requestId,
          status: MediationRequestStatus.SUBMITTED,
          assignedMediatorId: null,
        },
        data: {
          status: MediationRequestStatus.UNDER_REVIEW,
          assignedMediatorId: mediatorId,
          reviewedAt: new Date(),
        },
      });

      /*
       * Protege contra dos mediadores intentando
       * tomar la misma solicitud al mismo tiempo.
       */
      if (updated.count !== 1) {
        throw new ConflictException("Otro mediador tomó esta solicitud");
      }

      await transaction.requestStatusHistory.create({
        data: {
          requestId,
          changedById: mediatorId,
          fromStatus: MediationRequestStatus.SUBMITTED,
          toStatus: MediationRequestStatus.UNDER_REVIEW,
          comment: "La solicitud fue tomada para revisión",
        },
      });

      return transaction.mediationRequest.findUnique({
        where: {
          id: requestId,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          assignedMediator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  }

  async decide(
    requestId: string,
    currentUser: AuthenticatedUser,
    dto: DecideMediationRequestDto,
  ) {
    const request = await this.prisma.mediationRequest.findFirst({
      where: {
        id: requestId,
        deletedAt: null,
      },
    });

    if (!request) {
      throw new NotFoundException("Solicitud de mediación no encontrada");
    }

    const isAssignedMediator =
      request.assignedMediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        "No tienes permiso para decidir sobre esta solicitud",
      );
    }

    if (request.status !== MediationRequestStatus.UNDER_REVIEW) {
      throw new ConflictException("La solicitud debe encontrarse en revisión");
    }

    if (
      dto.decision === MediationRequestStatus.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException("Debes proporcionar el motivo del rechazo");
    }

    if (
      dto.decision === MediationRequestStatus.ACCEPTED &&
      dto.rejectionReason
    ) {
      throw new BadRequestException(
        "Una solicitud aceptada no debe contener motivo de rechazo",
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      const updatedRequest = await transaction.mediationRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: dto.decision,
          decisionAt: new Date(),
          rejectionReason:
            dto.decision === MediationRequestStatus.REJECTED
              ? dto.rejectionReason?.trim()
              : null,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          assignedMediator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      await transaction.requestStatusHistory.create({
        data: {
          requestId,
          changedById: currentUser.userId,
          fromStatus: MediationRequestStatus.UNDER_REVIEW,
          toStatus: dto.decision,
          comment:
            dto.comment?.trim() ??
            (dto.decision === MediationRequestStatus.ACCEPTED
              ? "Solicitud aceptada por el mediador"
              : dto.rejectionReason?.trim()),
        },
      });

      const mediationCase =
        dto.decision === MediationRequestStatus.ACCEPTED
          ? await (async () => {
              if (!updatedRequest.assignedMediator) {
                throw new ConflictException(
                  "La solicitud no tiene un mediador asignado",
                );
              }

              return transaction.mediationCase.create({
                data: {
                  folio: this.casesService.generateFolio(),
                  title: updatedRequest.title,
                  description: updatedRequest.description,
                  status: CaseStatus.OPEN,
                  requestId: updatedRequest.id,
                  clientId: updatedRequest.clientId,
                  mediatorId: updatedRequest.assignedMediatorId!,

                  participants: {
                    create: [
                      {
                        userId: updatedRequest.client.id,
                        role: CaseParticipantRole.REQUESTING_PARTY,
                        firstName: updatedRequest.client.firstName,
                        lastName: updatedRequest.client.lastName,
                        email: updatedRequest.client.email,
                        phone: updatedRequest.client.phone,
                        acceptedAt: new Date(),
                      },
                      {
                        userId: updatedRequest.assignedMediator.id,
                        role: CaseParticipantRole.MEDIATOR,
                        firstName: updatedRequest.assignedMediator.firstName,
                        lastName: updatedRequest.assignedMediator.lastName,
                        email: updatedRequest.assignedMediator.email,
                        phone: updatedRequest.assignedMediator.phone,
                        acceptedAt: new Date(),
                      },
                    ],
                  },

                  statusHistory: {
                    create: {
                      changedById: currentUser.userId,
                      fromStatus: null,
                      toStatus: CaseStatus.OPEN,
                      comment: "Caso creado a partir de una solicitud aceptada",
                    },
                  },
                },
                include: {
                  participants: true,
                  statusHistory: true,
                },
              });
            })()
          : null;

      return {
        request: updatedRequest,
        case: mediationCase,
      };
    });
  }
}
