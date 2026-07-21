import * as DocumentPicker from 'expo-document-picker';

import {
  SelectedDocumentFile,
} from '../types/case-document.types';

const maximumFileSize =
  10 * 1024 * 1024;

const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function pickCaseDocument(): Promise<
  SelectedDocumentFile | null
> {
  const result =
    await DocumentPicker.getDocumentAsync({
      type: allowedMimeTypes,
      copyToCacheDirectory: true,
      multiple: false,
    });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset) {
    throw new Error(
      'No fue posible obtener el archivo seleccionado',
    );
  }

  const mimeType =
    asset.mimeType ??
    'application/octet-stream';

  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(
      'Solo se permiten archivos PDF, JPG, PNG, DOC y DOCX',
    );
  }

  if (
    typeof asset.size === 'number' &&
    asset.size > maximumFileSize
  ) {
    throw new Error(
      'El archivo no puede superar los 10 MB',
    );
  }

  return {
    uri: asset.uri,
    name: asset.name,
    mimeType,
    size:
      typeof asset.size === 'number'
        ? asset.size
        : null,
  };
}