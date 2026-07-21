import {
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
} from 'expo-router';
import { WebView } from 'react-native-webview';
//import * as Sharing from 'expo-sharing';

import { openFileWithCompatibleApp } from '../../../../src/services/file-opener.service';
import { caseDocumentsService } from '../../../../src/services/case-documents.service';
import { downloadProtectedFile } from '../../../../src/services/file-download.service';

export default function DocumentViewerScreen() {
  const params = useLocalSearchParams<{
    versionId?: string | string[];
    fileName?: string | string[];
    mimeType?: string | string[];
  }>();

  const versionId = Array.isArray(
    params.versionId,
  )
    ? params.versionId[0]
    : params.versionId;

  const fileName = Array.isArray(
    params.fileName,
  )
    ? params.fileName[0]
    : params.fileName;

  const mimeType = Array.isArray(
    params.mimeType,
  )
    ? params.mimeType[0]
    : params.mimeType;

  const [localUri, setLocalUri] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const isImage =
    mimeType === 'image/jpeg' ||
    mimeType === 'image/png';

  const isPdf =
    mimeType === 'application/pdf';

  useEffect(() => {
    const loadFile = async () => {
      if (!versionId || !fileName) {
        setError(
          'No se recibió la información del archivo',
        );
        setIsLoading(false);
        return;
      }

      try {
        const file =
          await downloadProtectedFile(
            caseDocumentsService.getPreviewPath(
              versionId,
            ),
            fileName,
          );

        setLocalUri(file.uri);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar el archivo',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadFile();
  }, [fileName, versionId]);

  const handleOpenExternally = async () => {
    if (!localUri) {
      return;
    }

    try {
      await openFileWithCompatibleApp({
        uri: localUri,
        mimeType:
          mimeType ??
          'application/octet-stream',
      });
    } catch (requestError) {
      Alert.alert(
        'No fue posible abrir el archivo',
        requestError instanceof Error
          ? requestError.message
          : 'No hay una aplicación compatible instalada',
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#1A365D"
        />

        <Text style={styles.loadingText}>
          Cargando documento...
        </Text>
      </View>
    );
  }

  if (error || !localUri) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error ??
            'No fue posible cargar el documento'}
        </Text>
      </View>
    );
  }

  if (isImage) {
    return (
      <View style={styles.container}>
        <Image
          source={{
            uri: localUri,
          }}
          resizeMode="contain"
          style={styles.image}
        />

        <Pressable
          style={styles.externalButton}
          onPress={() =>
            void handleOpenExternally()
          }
        >
          <Text
            style={
              styles.externalButtonText
            }
          >
            Abrir en otra aplicación
          </Text>
        </Pressable>
      </View>
    );
  }

  if (isPdf) {
    return (
      <View style={styles.center}>
        <Text style={styles.pdfTitle}>
          Documento PDF
        </Text>

        <Text style={styles.pdfMessage}>
          La vista previa interna de PDF no está
          disponible en este dispositivo. Puedes
          abrirlo con una aplicación compatible.
        </Text>

        <Pressable
          style={styles.externalButtonStandalone}
          onPress={() =>
            void handleOpenExternally()
          }
        >
          <Text style={styles.externalButtonText}>
            Abrir PDF con...
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.unsupportedTitle}>
        Vista previa no disponible
      </Text>

      <Text style={styles.unsupportedText}>
        Los archivos DOC y DOCX deben abrirse
        con una aplicación compatible.
      </Text>

      <Pressable
        style={styles.externalButtonStandalone}
        onPress={() =>
          void handleOpenExternally()
        }
      >
        <Text
          style={styles.externalButtonText}
        >
          Abrir archivo
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#4A5568',
  },

  errorText: {
    color: '#C53030',
    textAlign: 'center',
  },

  image: {
    flex: 1,
    width: '100%',
  },

  webView: {
    flex: 1,
  },

  externalButton: {
    alignItems: 'center',
    margin: 12,
    paddingVertical: 13,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  externalButtonStandalone: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  externalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  unsupportedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },

  unsupportedText: {
    marginTop: 9,
    textAlign: 'center',
    color: '#718096',
    lineHeight: 20,
  },

  pdfTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1A365D',
  },

  pdfMessage: {
    marginTop: 10,
    textAlign: 'center',
    color: '#718096',
    lineHeight: 21,
  },
});