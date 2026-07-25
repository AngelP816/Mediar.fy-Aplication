import {
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { PushTokensService } from './push-tokens.service';

@ApiTags('Push Tokens')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('push-tokens')
export class PushTokensController {
  constructor(
    private readonly pushTokensService:
      PushTokensService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary:
      'Registrar token push del dispositivo',
  })
  register(
    @Body()
    dto: RegisterPushTokenDto,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.pushTokensService.register(
      dto,
      currentUser,
    );
  }

  @Delete('unregister')
  @ApiOperation({
    summary:
      'Desactivar un token push',
  })
  unregister(
    @Body('token')
    token: string,
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.pushTokensService.unregister(
      token,
      currentUser,
    );
  }

  @Delete('unregister-all')
  @ApiOperation({
    summary:
      'Desactivar todos mis tokens push',
  })
  unregisterAll(
    @CurrentUser()
    currentUser: AuthenticatedUser,
  ) {
    return this.pushTokensService.unregisterAll(
      currentUser,
    );
  }
}