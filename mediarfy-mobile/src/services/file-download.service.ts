import {
  Directory,
  File,
  Paths,
} from 'expo-file-system';

import { api } from './api.service';

function sanitizeFileName(
  fileName: string,
): string {
  return fileName.replace(
    /[<>:"/\\|?*\u0000-\u001F]/g,
    '_',
  );
}

export async function downloadProtectedFile(
  relativeUrl: string,
  fileName: string,
): Promise<File> {
  const response = await api.get<ArrayBuffer>(
    relativeUrl,
    {
      responseType: 'arraybuffer',
      timeout: 60000,
    },
  );

  const directory = new Directory(
    Paths.cache,
    'mediarfy-documents',
  );

  if (!directory.exists) {
    directory.create({
      intermediates: true,
    });
  }

  const destination = new File(
    directory,
    `${Date.now()}-${sanitizeFileName(
      fileName,
    )}`,
  );

  destination.create({
    overwrite: true,
  });

  destination.write(
    new Uint8Array(response.data),
  );

  return destination;
}