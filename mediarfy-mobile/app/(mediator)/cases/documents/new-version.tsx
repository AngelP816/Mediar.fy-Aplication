import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import axios from 'axios';

import {
  SelectedDocumentFile,
} from '../../../../src/types/case-document.types';
import { caseDocumentsService } from '../../../../src/services/case-documents.service';
import { pickCaseDocument } from '../../../../src/utils/document-picker.util';
import { formatFileSize } from '../../../../src/utils/case-document.util';

export default function NewDocumentVersionScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    documentId?: string | string[];
    documentName?: string | string[];
  }>();

  const documentId = Array.isArray(
    params.documentId,
  )
    ? params.documentId[0]
    : params.documentId;

  const documentName = Array.isArray(
    params.documentName,
  )
    ? params.documentName[0]
    : params.documentName;

  const [notes, setNotes] = useState('');

  const [selectedFile, setSelectedFile] =
    useState<SelectedDocumentFile | null>(
      null,
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const handlePickFile = async () => {
    try {
      const file =
        await pickCaseDocument();

      if (file) {
        setSelectedFile(file);
      }
    } catch (error) {
      Alert.alert(
        'Archivo no válido',
        error instanceof Error
          ? error.message
          : 'No fue posible seleccionar el archivo',
      );
    }
  };

  const handleSubmit = async () => {
    if (!documentId) {
      Alert.alert(
        'Error',
        'No se recibió el identificador del documento',
      );

      return;
    }

    if (!selectedFile) {
      Alert.alert(
        'Archivo requerido',
        'Selecciona el archivo de la nueva versión',
      );

      return;
    }

    try {
      setIsSubmitting(true);

      const version =
        await caseDocumentsService.createVersion(
          documentId,
          {
            notes:
              notes.trim() || undefined,
          },
          selectedFile,
        );

      Alert.alert(
        'Versión agregada',
        `La versión ${version.versionNumber} se creó correctamente.`,
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message;

        Alert.alert(
          'No fue posible subir la versión',
          Array.isArray(message)
            ? message.join('\n')
            : typeof message === 'string'
              ? message
              : error.message ||
                'Ocurrió un error al subir el archivo',
        );
      } else {
        Alert.alert(
          'No fue posible subir la versión',
          error instanceof Error
            ? error.message
            : 'Ocurrió un error inesperado',
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Nueva versión
      </Text>

      <Text style={styles.subtitle}>
        Agrega un archivo actualizado sin eliminar
        las versiones anteriores.
      </Text>

      {documentName ? (
        <View style={styles.documentInfo}>
          <Text style={styles.documentLabel}>
            Documento
          </Text>

          <Text style={styles.documentName}>
            {documentName}
          </Text>
        </View>
      ) : null}

      <Text style={styles.label}>
        Archivo actualizado
      </Text>

      <Pressable
        disabled={isSubmitting}
        style={styles.fileButton}
        onPress={() =>
          void handlePickFile()
        }
      >
        <Text style={styles.fileButtonText}>
          {selectedFile
            ? 'Cambiar archivo'
            : 'Seleccionar archivo'}
        </Text>
      </Pressable>

      {selectedFile ? (
        <View style={styles.selectedFile}>
          <Text style={styles.selectedFileName}>
            {selectedFile.name}
          </Text>

          <Text style={styles.selectedFileDetail}>
            {selectedFile.mimeType}
          </Text>

          {selectedFile.size !== null ? (
            <Text style={styles.selectedFileDetail}>
              {formatFileSize(
                selectedFile.size,
              )}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.label}>
        Notas de la versión
      </Text>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        editable={!isSubmitting}
        multiline
        maxLength={500}
        textAlignVertical="top"
        style={[
          styles.input,
          styles.notesInput,
        ]}
        placeholder="Ejemplo: Documento corregido con los datos actualizados"
      />

      <Pressable
        disabled={isSubmitting}
        style={[
          styles.submitButton,
          isSubmitting &&
            styles.disabledButton,
        ]}
        onPress={() =>
          void handleSubmit()
        }
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>
            Subir nueva versión
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#1A365D',
  },

  subtitle: {
    marginTop: 8,
    color: '#718096',
    lineHeight: 21,
  },

  documentInfo: {
    marginTop: 18,
    padding: 14,
    borderRadius: 11,
    backgroundColor: '#EBF8FF',
  },

  documentLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  documentName: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A365D',
  },

  label: {
    marginTop: 20,
    marginBottom: 7,
    fontWeight: '700',
    color: '#2D3748',
  },

  fileButton: {
    alignItems: 'center',
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 10,
    backgroundColor: '#EBF8FF',
  },

  fileButtonText: {
    color: '#2B6CB0',
    fontWeight: '700',
  },

  selectedFile: {
    marginTop: 10,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  selectedFileName: {
    fontWeight: '700',
    color: '#2D3748',
  },

  selectedFileDetail: {
    marginTop: 5,
    fontSize: 12,
    color: '#718096',
  },

  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#1A202C',
  },

  notesInput: {
    minHeight: 110,
  },

  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 28,
    borderRadius: 10,
    backgroundColor: '#1A365D',
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },
});