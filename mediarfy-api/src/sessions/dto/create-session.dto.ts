import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { SessionModality } from '../../generated/prisma/enums';

export class CreateSessionDto {
  @ApiProperty({
    example: 'Primera sesión de mediación',
  })
  @IsString()
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    example: 'Revisión inicial del conflicto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: '2026-07-20T18:00:00.000Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    example: 60,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiProperty({
    enum: SessionModality,
    example: SessionModality.VIRTUAL,
  })
  @IsEnum(SessionModality)
  modality: SessionModality;

  @ApiPropertyOptional({
    example: 'Sala de juntas de Mediarfy',
  })
  @ValidateIf(
    (dto: CreateSessionDto) =>
      dto.modality === SessionModality.IN_PERSON ||
      dto.modality === SessionModality.HYBRID,
  )
  @IsString()
  @MaxLength(300)
  location?: string;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
  })
  @ValidateIf(
    (dto: CreateSessionDto) =>
      dto.modality === SessionModality.VIRTUAL ||
      dto.modality === SessionModality.HYBRID,
  )
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  meetingUrl?: string;

  @ApiPropertyOptional({
    example: 'Ambas partes confirmaron disponibilidad',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}