import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Registrar un cliente',
  })
  @ApiCreatedResponse({
    description: 'Usuario registrado correctamente',
  })
  @ApiConflictResponse({
    description: 'El correo ya está registrado',
  })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
  })
  @ApiOkResponse({
    description: 'Inicio de sesión correcto',
  })
  @ApiUnauthorizedResponse({
    description: 'Credenciales incorrectas',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renovar una sesión',
  })
  @ApiOkResponse({
    description:
      'Access token y refresh token renovados correctamente',
  })
  @ApiUnauthorizedResponse({
    description:
      'El refresh token es inválido, expiró o fue revocado',
  })
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ) {
    return this.authService.refresh(
      refreshTokenDto,
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cerrar la sesión actual',
  })
  @ApiNoContentResponse({
    description: 'Sesión cerrada correctamente',
  })
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<void> {
    await this.authService.logout(
      refreshTokenDto,
    );
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar todas las sesiones del usuario',
  })
  @ApiOkResponse({
    description:
      'Todas las sesiones fueron revocadas',
  })
  @ApiUnauthorizedResponse({
    description:
      'Access token ausente, inválido o expirado',
  })
  logoutAll(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.authService.logoutAll(
      currentUser.userId,
    );
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Consultar el perfil autenticado',
  })
  @ApiOkResponse({
    description:
      'Perfil del usuario autenticado',
  })
  @ApiUnauthorizedResponse({
    description:
      'Token ausente, inválido o expirado',
  })
  profile(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.usersService.findById(
      currentUser.userId,
    );
  }
}