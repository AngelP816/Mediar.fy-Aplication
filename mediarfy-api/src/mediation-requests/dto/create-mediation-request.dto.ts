import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import {
  MediationType,
  UrgencyLevel,
} from '../../generated/prisma/enums';

export class CreateMediationRequestDto {
  @ApiProperty({
    example: 'Incumplimiento de contrato de arrendamiento',
    minLength: 5,
    maxLength: 150,
  })
  @IsString()
  @Length(5, 150, {
    message: 'El título debe contener entre 5 y 150 caracteres',
  })
  title: string;

  @ApiProperty({
    example:
      'El arrendador no ha realizado las reparaciones establecidas en el contrato.',
    minLength: 20,
    maxLength: 3000,
  })
  @IsString()
  @Length(20, 3000, {
    message:
      'La descripción debe contener entre 20 y 3000 caracteres',
  })
  description: string;

  @ApiProperty({
    enum: MediationType,
    example: MediationType.LEASE,
  })
  @IsEnum(MediationType, {
    message: 'El tipo de mediación no es válido',
  })
  type: MediationType;

  @ApiPropertyOptional({
    enum: UrgencyLevel,
    default: UrgencyLevel.MEDIUM,
  })
  @IsOptional()
  @IsEnum(UrgencyLevel, {
    message: 'El nivel de urgencia no es válido',
  })
  urgency?: UrgencyLevel;
}