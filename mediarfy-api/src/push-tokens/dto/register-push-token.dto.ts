import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MaxLength(500)
  token!: string;

  @IsIn([
    'android',
    'ios',
    'web',
  ])
  platform!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deviceId?: string;
}