import {
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  diskStorage,
  FileFilterCallback,
} from 'multer';
import { extname } from 'path';

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const caseDocumentStorage =
  diskStorage({
    destination:
      './uploads/case-documents',

    filename: (
      _request,
      file,
      callback,
    ) => {
      const extension = extname(
        file.originalname,
      ).toLowerCase();

      const storedName =
        `${randomUUID()}${extension}`;

      callback(null, storedName);
    },
  });

export function caseDocumentFileFilter(
  _request: Express.Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) {
  if (
    !allowedMimeTypes.includes(
      file.mimetype,
    )
  ) {
    callback(
      new BadRequestException(
        'Solo se permiten archivos PDF, JPG, PNG, DOC y DOCX',
      ),
    );

    return;
  }

  callback(null, true);
}