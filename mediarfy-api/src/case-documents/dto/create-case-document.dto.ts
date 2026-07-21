import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import { CaseDocumentType } from '../../generated/prisma/enums';

export class CreateCaseDocumentDto {
  @ApiProperty({
    example: 'Identificación oficial',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example:
      'Identificación oficial proporcionada por la parte invitada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    enum: CaseDocumentType,
    example: CaseDocumentType.IDENTIFICATION,
  })
  @IsEnum(CaseDocumentType, {
    message:
      'El tipo de documento seleccionado no es válido',
  })
  type!: CaseDocumentType;

  @ApiPropertyOptional({
    example: 'Primera versión del documento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}