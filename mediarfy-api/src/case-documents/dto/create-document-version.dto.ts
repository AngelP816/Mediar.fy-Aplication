import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreateDocumentVersionDto {
  @ApiPropertyOptional({
    example:
      'Documento corregido con información actualizada',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}