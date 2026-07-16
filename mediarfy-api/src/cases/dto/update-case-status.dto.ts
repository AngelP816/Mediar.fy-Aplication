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
import { CaseStatus } from '../../generated/prisma/enums';

export class UpdateCaseStatusDto {
  @ApiProperty({
    enum: CaseStatus,
    example: CaseStatus.INFORMATION_PENDING,
  })
  @IsEnum(CaseStatus, {
    message: 'El estado del caso no es válido',
  })
  status: CaseStatus;

  @ApiPropertyOptional({
    example:
      'Se solicitó documentación adicional al cliente',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}