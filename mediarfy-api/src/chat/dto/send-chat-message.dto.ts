import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendChatMessageDto {
  @IsString()
  @MinLength(1, {
    message: 'El mensaje no puede estar vacío',
  })
  @MaxLength(4000, {
    message: 'El mensaje no puede superar los 4000 caracteres',
  })
  content: string;
}