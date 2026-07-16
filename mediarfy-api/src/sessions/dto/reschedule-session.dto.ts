import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class RescheduleSessionDto {
  @ApiProperty({
    example: '2026-07-25T18:00:00.000Z',
  })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example:
      'Se cambió la fecha por disponibilidad de las partes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}