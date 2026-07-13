import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'angel@correo.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @ApiProperty({
    example: 'Angel',
  })
  @IsString()
  @Length(2, 60)
  firstName: string;

  @ApiProperty({
    example: 'Pérez García',
  })
  @IsString()
  @Length(2, 100)
  lastName: string;

  @ApiPropertyOptional({
    example: '9981234567',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'El teléfono debe contener 10 dígitos',
  })
  phone?: string;

  @ApiProperty({
    example: 'Mediarfy2026*',
  })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/[A-Z]/, {
    message: 'La contraseña debe contener una mayúscula',
  })
  @Matches(/[a-z]/, {
    message: 'La contraseña debe contener una minúscula',
  })
  @Matches(/[0-9]/, {
    message: 'La contraseña debe contener un número',
  })
  password: string;
}