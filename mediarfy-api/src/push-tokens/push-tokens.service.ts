import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Injectable()
export class PushTokensService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async register(
    dto: RegisterPushTokenDto,
    currentUser: AuthenticatedUser,
  ) {
    if (
      !dto.token.startsWith(
        'ExponentPushToken[',
      ) &&
      !dto.token.startsWith(
        'ExpoPushToken[',
      )
    ) {
      throw new BadRequestException(
        'El token push no tiene un formato válido',
      );
    }

    /*
     * Un token puede haber pertenecido anteriormente
     * a otra sesión o usuario en el mismo dispositivo.
     *
     * upsert garantiza que quede asociado al usuario
     * que inició sesión actualmente.
     */
    return this.prisma.pushToken.upsert({
      where: {
        token: dto.token,
      },
      create: {
        userId: currentUser.userId,
        token: dto.token,
        platform: dto.platform,
        deviceId: dto.deviceId ?? null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        userId: currentUser.userId,
        platform: dto.platform,
        deviceId: dto.deviceId ?? null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async unregister(
    token: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.prisma.pushToken.updateMany({
      where: {
        token,
        userId: currentUser.userId,
      },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
    };
  }

  async unregisterAll(
    currentUser: AuthenticatedUser,
  ) {
    const result =
      await this.prisma.pushToken.updateMany({
        where: {
          userId: currentUser.userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

    return {
      updated: result.count,
    };
  }

  async findActiveByUser(
    userId: string,
  ) {
    return this.prisma.pushToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        token: true,
        platform: true,
      },
    });
  }
}