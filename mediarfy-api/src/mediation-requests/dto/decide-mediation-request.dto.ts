import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { MediationRequestStatus } from '../../generated/prisma/enums';

const allowedDecisions = [
  MediationRequestStatus.ACCEPTED,
  MediationRequestStatus.REJECTED,
] as const;

export class DecideMediationRequestDto {
  @ApiProperty({
    enum: allowedDecisions,
    example: MediationRequestStatus.ACCEPTED,
  })
  @IsEnum(MediationRequestStatus, {
    message: 'La decisión seleccionada no es válida',
  })
  decision:
    | typeof MediationRequestStatus.ACCEPTED
    | typeof MediationRequestStatus.REJECTED;

  @ApiPropertyOptional({
    example:
      'La solicitud no contiene información suficiente para iniciar la mediación.',
  })
  @ValidateIf(
    (dto: DecideMediationRequestDto) =>
      dto.decision === MediationRequestStatus.REJECTED,
  )
  @IsString()
  @Length(10, 1000, {
    message:
      'El motivo del rechazo debe contener entre 10 y 1000 caracteres',
  })
  rejectionReason?: string;

  @ApiPropertyOptional({
    example: 'Solicitud revisada por el mediador.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 1000)
  comment?: string;
}