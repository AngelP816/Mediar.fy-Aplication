import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  createHash,
  randomBytes,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: 'CLIENT' | 'MEDIATOR' | 'ADMIN';
}

interface SessionUser {
  id: string;
  email: string;
  role: 'CLIENT' | 'MEDIATOR' | 'ADMIN';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const passwordHash = await bcrypt.hash(
      registerDto.password,
      12,
    );

    const user = await this.usersService.create({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phone: registerDto.phone,
    });

    const session = await this.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Usuario registrado correctamente',
      user,
      ...session,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(
      loginDto.email,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Correo o contraseña incorrectos',
      );
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException(
        'Correo o contraseña incorrectos',
      );
    }

    if (user.status !== 'ACTIVE' || user.deletedAt !== null) {
      throw new UnauthorizedException(
        'La cuenta no se encuentra activa',
      );
    }

    await this.usersService.updateLastLogin(user.id);

    const session = await this.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Inicio de sesión correcto',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
      ...session,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const tokenHash = this.hashRefreshToken(
      refreshTokenDto.refreshToken,
    );

    const storedToken =
      await this.prisma.refreshToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (
      !storedToken ||
      storedToken.revokedAt !== null ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'El refresh token es inválido, expiró o fue revocado',
      );
    }

    if (
      storedToken.user.status !== 'ACTIVE' ||
      storedToken.user.deletedAt !== null
    ) {
      throw new UnauthorizedException(
        'La cuenta no se encuentra activa',
      );
    }

    const newRefreshToken = this.generateRefreshToken();
    const newTokenHash =
      this.hashRefreshToken(newRefreshToken);
    const newExpiresAt =
      this.getRefreshTokenExpiration();

    await this.prisma.$transaction(async (transaction) => {
      const revoked =
        await transaction.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
          },
        });

      /*
       * Evita que el mismo refresh token sea utilizado dos
       * veces simultáneamente.
       */
      if (revoked.count !== 1) {
        throw new UnauthorizedException(
          'El refresh token ya fue utilizado',
        );
      }

      await transaction.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.userId,
          expiresAt: newExpiresAt,
        },
      });
    });

    const accessToken =
      await this.generateAccessToken({
        sub: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      });

    return {
      message: 'Sesión renovada correctamente',
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  async logout(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<void> {
    const tokenHash = this.hashRefreshToken(
      refreshTokenDto.refreshToken,
    );

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async logoutAll(userId: string) {
    const result =
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

    return {
      message: 'Todas las sesiones fueron cerradas',
      revokedSessions: result.count,
    };
  }

  private async createSession(user: SessionUser) {
    const refreshToken = this.generateRefreshToken();
    const tokenHash =
      this.hashRefreshToken(refreshToken);
    const expiresAt =
      this.getRefreshTokenExpiration();

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    const accessToken =
      await this.generateAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
    };
  }

  private async generateAccessToken(
    payload: JwtPayload,
  ): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashRefreshToken(
    refreshToken: string,
  ): string {
    return createHash('sha256')
      .update(refreshToken)
      .digest('hex');
  }

  private getRefreshTokenExpiration(): Date {
    const configuredDays =
      this.configService.get<string>(
        'REFRESH_TOKEN_TTL_DAYS',
        '7',
      );

    const days = Number(configuredDays);

    if (!Number.isFinite(days) || days <= 0) {
      throw new Error(
        'REFRESH_TOKEN_TTL_DAYS debe ser un número mayor que cero',
      );
    }

    const expiration = new Date();

    expiration.setDate(
      expiration.getDate() + days,
    );

    return expiration;
  }
}