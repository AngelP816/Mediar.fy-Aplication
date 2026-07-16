import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { SessionStatus } from '../../generated/prisma/enums';

export class UpdateSessionStatusDto {
  @ApiProperty({
    enum: SessionStatus,
    example: SessionStatus.CONFIRMED,
  })
  @IsEnum(SessionStatus, {
    message: 'El estado de la sesión no es válido',
  })
  status: SessionStatus;

  @ApiPropertyOptional({
    example: 'La sesión fue confirmada por las partes',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}