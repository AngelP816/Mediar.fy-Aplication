import { Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

interface OpenFileOptions {
  uri: string;
  mimeType: string;
}

export async function openFileWithCompatibleApp({
  uri,
  mimeType,
}: OpenFileOptions): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      const contentUri =
        await FileSystem.getContentUriAsync(
          uri,
        );

      await IntentLauncher.startActivityAsync(
        'android.intent.action.VIEW',
        {
          data: contentUri,
          type:
            mimeType ||
            'application/octet-stream',
          flags: 1,
        },
      );

      return;
    }

    const available =
      await Sharing.isAvailableAsync();

    if (!available) {
      throw new Error(
        'La apertura de archivos no está disponible',
      );
    }

    await Sharing.shareAsync(uri, {
      mimeType:
        mimeType ||
        'application/octet-stream',
    });
  } catch (error) {
    console.log(
      'Error del visor externo:',
      error,
    );

    throw new Error(
      'No se encontró una aplicación compatible con este tipo de archivo',
    );
  }
}