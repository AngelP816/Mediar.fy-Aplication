import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  CaseParticipantRole,
  CaseStatus,
  Role,
} from '../generated/prisma/enums';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  generateFolio(): string {
    const year = new Date().getFullYear();

    const randomPart = randomBytes(4)
      .toString('hex')
      .toUpperCase();

    return `CAS-${year}-${randomPart}`;
  }

  async findMine(currentUser: AuthenticatedUser) {
    return this.prisma.mediationCase.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            clientId: currentUser.userId,
          },
          {
            mediatorId: currentUser.userId,
          },
          {
            participants: {
              some: {
                userId: currentUser.userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        folio: true,
        title: true,
        description: true,
        status: true,
        openedAt: true,
        closedAt: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        mediator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(
    caseId: string,
    currentUser: AuthenticatedUser,
  ) {
    const mediationCase =
      await this.prisma.mediationCase.findFirst({
        where: {
          id: caseId,
          deletedAt: null,
        },
        include: {
          request: {
            select: {
              id: true,
              folio: true,
              type: true,
              urgency: true,
            },
          },
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          mediator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          participants: {
            orderBy: {
              createdAt: 'asc',
            },
          },
          statusHistory: {
            include: {
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
              createdAt: 'asc',
            },
          },
        },
      });

    if (!mediationCase) {
      throw new NotFoundException(
        'Caso de mediación no encontrado',
      );
    }

    const isClient =
      mediationCase.clientId === currentUser.userId;

    const isMediator =
      mediationCase.mediatorId === currentUser.userId;

    const isParticipant =
      mediationCase.participants.some(
        (participant) =>
          participant.userId === currentUser.userId,
      );

    const isAdmin =
      currentUser.role === Role.ADMIN;

    if (
      !isClient &&
      !isMediator &&
      !isParticipant &&
      !isAdmin
    ) {
      throw new ForbiddenException(
        'No tienes permiso para consultar este caso',
      );
    }

    return mediationCase;
  }

  getInitialStatus(): CaseStatus {
    return CaseStatus.OPEN;
  }

  getClientParticipantRole(): CaseParticipantRole {
    return CaseParticipantRole.REQUESTING_PARTY;
  }

  getMediatorParticipantRole(): CaseParticipantRole {
    return CaseParticipantRole.MEDIATOR;
  }
}