import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ShareChatDocumentDto {
  @IsUUID('4', {
    message: 'El identificador del documento no es válido',
  })
  documentId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'El mensaje no puede superar los 500 caracteres',
  })
  content?: string;
}
