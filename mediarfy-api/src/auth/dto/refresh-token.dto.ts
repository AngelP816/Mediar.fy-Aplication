import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token entregado durante el inicio de sesión',
    example: 'fd84588ad49f...',
  })
  @IsString({
    message: 'El refresh token debe ser una cadena de texto',
  })
  @IsNotEmpty({
    message: 'El refresh token es obligatorio',
  })
  @MinLength(40, {
    message: 'El refresh token no tiene un formato válido',
  })
  refreshToken: string;
}