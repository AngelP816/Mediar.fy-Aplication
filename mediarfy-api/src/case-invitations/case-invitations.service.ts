import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import {
  CaseInvitationStatus,
  CaseParticipantRole,
  Role,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateCaseInvitationDto } from './dto/create-case-invitation.dto';

@Injectable()
export class CaseInvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    caseId: string,
    currentUser: AuthenticatedUser,
    dto: CreateCaseInvitationDto,
  ) {
    const mediationCase = await this.prisma.mediationCase.findFirst({
      where: {
        id: caseId,
        deletedAt: null,
      },
      select: {
        id: true,
        mediatorId: true,
        status: true,
        participants: {
          select: {
            id: true,
            userId: true,
            email: true,
          },
        },
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const isAssignedMediator = mediationCase.mediatorId === currentUser.userId;

    const isAdmin = currentUser.role === Role.ADMIN;

    if (!isAssignedMediator && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permiso para invitar participantes a este caso',
      );
    }

    const closedStatuses = [
      'CLOSED_SUCCESS',
      'CLOSED_NO_AGREEMENT',
      'CANCELLED',
    ];

    if (closedStatuses.includes(mediationCase.status)) {
      throw new ConflictException(
        'No se pueden agregar invitados a un caso finalizado',
      );
    }

    const allowedRoles: CaseParticipantRole[] = [
      CaseParticipantRole.INVITED_PARTY,
      CaseParticipantRole.LEGAL_REPRESENTATIVE,
      CaseParticipantRole.LAWYER,
      CaseParticipantRole.OBSERVER,
    ];

    if (!allowedRoles.includes(dto.participantRole)) {
      throw new ConflictException(
        'El rol seleccionado no puede asignarse mediante invitación',
      );
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    const invitedUser = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!invitedUser) {
      throw new NotFoundException(
        'No existe una cuenta registrada con este correo electrónico',
      );
    }

    if (invitedUser.id === currentUser.userId) {
      throw new ConflictException(
        'No puedes enviarte una invitación a ti mismo',
      );
    }

    const existingParticipant = mediationCase.participants.find(
      (participant) =>
        participant.userId === invitedUser.id ||
        participant.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (existingParticipant) {
      throw new ConflictException('Esta persona ya participa en el caso');
    }

    const pendingInvitation = await this.prisma.caseInvitation.findFirst({
      where: {
        caseId,
        email: normalizedEmail,
        status: CaseInvitationStatus.PENDING,
      },
    });

    if (pendingInvitation) {
      throw new ConflictException(
        'Ya existe una invitación pendiente para este correo',
      );
    }

    const token = randomBytes(32).toString('hex');

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.caseInvitation.create({
      data: {
        caseId,
        invitedById: currentUser.userId,
        email: invitedUser.email.trim().toLowerCase(),
        firstName: invitedUser.firstName,
        lastName: invitedUser.lastName,
        phone: invitedUser.phone ?? dto.phone?.trim() ?? null,
        participantRole: dto.participantRole,
        status: CaseInvitationStatus.PENDING,
        token,
        expiresAt,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findByCase(caseId: string, currentUser: AuthenticatedUser) {
    const mediationCase = await this.prisma.mediationCase.findFirst({
      where: {
        id: caseId,
        deletedAt: null,
      },
      select: {
        id: true,
        clientId: true,
        mediatorId: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!mediationCase) {
      throw new NotFoundException('Caso de mediación no encontrado');
    }

    const isAdmin = currentUser.role === Role.ADMIN;

    const isClient = mediationCase.clientId === currentUser.userId;

    const isMediator = mediationCase.mediatorId === currentUser.userId;

    const isParticipant = mediationCase.participants.some(
      (participant) => participant.userId === currentUser.userId,
    );

    if (!isAdmin && !isClient && !isMediator && !isParticipant) {
      throw new ForbiddenException(
        'No tienes permiso para consultar las invitaciones de este caso',
      );
    }

    return this.prisma.caseInvitation.findMany({
      where: {
        caseId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        acceptedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findMine(currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const normalizedEmail = user.email.trim().toLowerCase();

    await this.prisma.caseInvitation.updateMany({
      where: {
        email: normalizedEmail,
        status: CaseInvitationStatus.PENDING,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: CaseInvitationStatus.EXPIRED,
      },
    });

    return this.prisma.caseInvitation.findMany({
      where: {
        email: normalizedEmail,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        mediationCase: {
          select: {
            id: true,
            folio: true,
            title: true,
            description: true,
            status: true,
            openedAt: true,
            mediator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async accept(invitationId: string, currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const invitation = await this.prisma.caseInvitation.findUnique({
      where: {
        id: invitationId,
      },
      include: {
        mediationCase: {
          select: {
            id: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!invitation || invitation.mediationCase.deletedAt) {
      throw new NotFoundException('Invitación no encontrada');
    }

    const userEmail = user.email.trim().toLowerCase();

    const invitationEmail = invitation.email.trim().toLowerCase();

    if (userEmail !== invitationEmail) {
      throw new ForbiddenException(
        'Esta invitación pertenece a otro correo electrónico',
      );
    }

    if (invitation.status !== CaseInvitationStatus.PENDING) {
      throw new ConflictException(
        `La invitación se encuentra en estado ${invitation.status}`,
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.caseInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: CaseInvitationStatus.EXPIRED,
        },
      });

      throw new ConflictException('La invitación ha expirado');
    }

    const finalCaseStatuses = [
      'CLOSED_SUCCESS',
      'CLOSED_NO_AGREEMENT',
      'CANCELLED',
    ];

    if (finalCaseStatuses.includes(invitation.mediationCase.status)) {
      throw new ConflictException('El caso ya se encuentra finalizado');
    }

    return this.prisma.$transaction(async (transaction) => {
      const existingParticipant = await transaction.caseParticipant.findFirst({
        where: {
          caseId: invitation.caseId,
          OR: [
            {
              userId: user.id,
            },
            {
              email: userEmail,
            },
          ],
        },
      });

      if (existingParticipant) {
        throw new ConflictException('Ya formas parte de este caso');
      }

      const updatedInvitation = await transaction.caseInvitation.updateMany({
        where: {
          id: invitation.id,
          status: CaseInvitationStatus.PENDING,
        },
        data: {
          status: CaseInvitationStatus.ACCEPTED,
          acceptedById: user.id,
          acceptedAt: new Date(),
        },
      });

      if (updatedInvitation.count !== 1) {
        throw new ConflictException(
          'La invitación fue modificada por otro usuario',
        );
      }

      const participant = await transaction.caseParticipant.create({
        data: {
          caseId: invitation.caseId,
          userId: user.id,
          firstName: invitation.firstName || user.firstName,
          lastName: invitation.lastName || user.lastName,
          email: userEmail,
          phone: invitation.phone || user.phone || null,
          role: invitation.participantRole,
        },
      });

      const acceptedInvitation = await transaction.caseInvitation.findUnique({
        where: {
          id: invitation.id,
        },
        include: {
          mediationCase: {
            select: {
              id: true,
              folio: true,
              title: true,
              status: true,
            },
          },
          acceptedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return {
        invitation: acceptedInvitation,
        participant,
      };
    });
  }

  async reject(invitationId: string, currentUser: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: currentUser.userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const invitation = await this.prisma.caseInvitation.findUnique({
      where: {
        id: invitationId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    const userEmail = user.email.trim().toLowerCase();

    const invitationEmail = invitation.email.trim().toLowerCase();

    if (userEmail !== invitationEmail) {
      throw new ForbiddenException(
        'Esta invitación pertenece a otro correo electrónico',
      );
    }

    if (invitation.status !== CaseInvitationStatus.PENDING) {
      throw new ConflictException(
        `La invitación se encuentra en estado ${invitation.status}`,
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.caseInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: CaseInvitationStatus.EXPIRED,
        },
      });

      throw new ConflictException('La invitación ha expirado');
    }

    const updated = await this.prisma.caseInvitation.updateMany({
      where: {
        id: invitation.id,
        status: CaseInvitationStatus.PENDING,
      },
      data: {
        status: CaseInvitationStatus.REJECTED,
        rejectedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'La invitación fue modificada por otro usuario',
      );
    }

    return this.prisma.caseInvitation.findUnique({
      where: {
        id: invitation.id,
      },
      include: {
        mediationCase: {
          select: {
            id: true,
            folio: true,
            title: true,
            status: true,
          },
        },
      },
    });
  }
}
