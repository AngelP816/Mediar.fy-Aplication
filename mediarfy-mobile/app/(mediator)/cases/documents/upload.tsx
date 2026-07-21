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
  CaseDocumentType,
  SelectedDocumentFile,
} from '../../../../src/types/case-document.types';
import { caseDocumentsService } from '../../../../src/services/case-documents.service';
import { pickCaseDocument } from '../../../../src/utils/document-picker.util';
import { documentTypeLabels } from '../../../../src/utils/case-document.util';

const availableDocumentTypes:
  CaseDocumentType[] = [
    'IDENTIFICATION',
    'PROPERTY_DOCUMENT',
    'CONTRACT',
    'REQUEST',
    'EVIDENCE',
    'AGREEMENT_DRAFT',
    'SIGNED_AGREEMENT',
    'REGISTRATION_PROOF',
    'PAYMENT_RECEIPT',
    'OTHER',
  ];

export default function UploadDocumentScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    caseId?: string | string[];
  }>();

  const caseId = Array.isArray(params.caseId)
    ? params.caseId[0]
    : params.caseId;

  const [name, setName] = useState('');
  const [description, setDescription] =
    useState('');
  const [notes, setNotes] = useState('');

  const [type, setType] =
    useState<CaseDocumentType>(
      'IDENTIFICATION',
    );

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

        if (!name.trim()) {
          setName(
            file.name.replace(
              /\.[^/.]+$/,
              '',
            ),
          );
        }
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

  const validateForm = (): string | null => {
    if (!caseId) {
      return 'No se recibió el identificador del caso';
    }

    if (!name.trim()) {
      return 'Escribe el nombre del documento';
    }

    if (name.trim().length < 2) {
      return 'El nombre debe tener al menos 2 caracteres';
    }

    if (!selectedFile) {
      return 'Selecciona un archivo';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();

    if (validationError) {
      Alert.alert(
        'Revisa la información',
        validationError,
      );

      return;
    }

    if (!caseId || !selectedFile) {
      return;
    }

    try {
      setIsSubmitting(true);

      await caseDocumentsService.create(
        caseId,
        {
          name: name.trim(),
          description:
            description.trim() || undefined,
          type,
          notes:
            notes.trim() || undefined,
        },
        selectedFile,
      );

      Alert.alert(
        'Documento guardado',
        'El archivo fue agregado al expediente.',
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
          'No fue posible subir el documento',
          Array.isArray(message)
            ? message.join('\n')
            : typeof message === 'string'
              ? message
              : error.message ||
                'Ocurrió un error al subir el archivo',
        );
      } else {
        Alert.alert(
          'No fue posible subir el documento',
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
        Subir documento
      </Text>

      <Text style={styles.subtitle}>
        Agrega un archivo al expediente. El
        tamaño máximo permitido es de 10 MB.
      </Text>

      <Text style={styles.label}>
        Archivo
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
            <Text
              style={styles.selectedFileDetail}
            >
              {(
                selectedFile.size /
                (1024 * 1024)
              ).toFixed(2)}{' '}
              MB
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.label}>
        Nombre del documento
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        editable={!isSubmitting}
        maxLength={150}
        style={styles.input}
        placeholder="Identificación oficial"
      />

      <Text style={styles.label}>
        Tipo de documento
      </Text>

      <View style={styles.typeContainer}>
        {availableDocumentTypes.map(
          (option) => {
            const isSelected =
              type === option;

            return (
              <Pressable
                key={option}
                disabled={isSubmitting}
                style={[
                  styles.typeButton,
                  isSelected &&
                    styles.selectedTypeButton,
                ]}
                onPress={() =>
                  setType(option)
                }
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    isSelected &&
                      styles.selectedTypeText,
                  ]}
                >
                  {
                    documentTypeLabels[
                      option
                    ]
                  }
                </Text>
              </Pressable>
            );
          },
        )}
      </View>

      <Text style={styles.label}>
        Descripción
      </Text>

      <TextInput
        value={description}
        onChangeText={setDescription}
        editable={!isSubmitting}
        multiline
        maxLength={1000}
        textAlignVertical="top"
        style={[
          styles.input,
          styles.multilineInput,
        ]}
        placeholder="Descripción opcional"
      />

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
        placeholder="Primera versión del documento"
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
            Subir documento
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

  label: {
    marginTop: 18,
    marginBottom: 7,
    fontWeight: '700',
    color: '#2D3748',
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

  multilineInput: {
    minHeight: 100,
  },

  notesInput: {
    minHeight: 85,
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
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  selectedFileName: {
    fontWeight: '700',
    color: '#2D3748',
  },

  selectedFileDetail: {
    marginTop: 4,
    fontSize: 12,
    color: '#718096',
  },

  typeContainer: {
    gap: 8,
  },

  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },

  selectedTypeButton: {
    borderColor: '#1A365D',
    backgroundColor: '#1A365D',
  },

  typeButtonText: {
    color: '#4A5568',
    fontWeight: '600',
  },

  selectedTypeText: {
    color: '#FFFFFF',
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