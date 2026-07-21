import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import { CaseParticipantRole } from '../../generated/prisma/enums';

const allowedInvitationRoles = [
  CaseParticipantRole.INVITED_PARTY,
  CaseParticipantRole.LEGAL_REPRESENTATIVE,
  CaseParticipantRole.LAWYER,
  CaseParticipantRole.OBSERVER,
] as const;

export class CreateCaseInvitationDto {
  @ApiProperty({
    example: 'invitado@correo.com',
  })
  @IsEmail(
    {},
    {
      message:
        'El correo electrónico no es válido',
    },
  )
  email!: string;

  @ApiPropertyOptional({
    example: '9981234567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    enum: allowedInvitationRoles,
    example:
      CaseParticipantRole.INVITED_PARTY,
  })
  @IsIn(allowedInvitationRoles, {
    message:
      'El rol seleccionado no está permitido',
  })
  participantRole!: CaseParticipantRole;
}