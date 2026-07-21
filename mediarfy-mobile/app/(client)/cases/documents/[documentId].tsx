import {
  useCallback,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import axios from 'axios';

import type {
  CaseDocumentVersion,
} from '../../../../src/types/case-document.types';

import { caseDocumentsService } from '../../../../src/services/case-documents.service';
import { downloadProtectedFile } from '../../../../src/services/file-download.service';
import { openFileWithCompatibleApp } from '../../../../src/services/file-opener.service';
import { formatFileSize } from '../../../../src/utils/case-document.util';

export default function ClientDocumentVersionsScreen() {
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

  const [versions, setVersions] =
    useState<CaseDocumentVersion[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    processingVersionId,
    setProcessingVersionId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadVersions =
    useCallback(async () => {
      if (!documentId) {
        setError(
          'No se recibió el identificador del documento.',
        );
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      try {
        setError(null);

        const data =
          await caseDocumentsService.getVersions(
            documentId,
          );

        setVersions(data);
      } catch (requestError) {
        if (axios.isAxiosError(requestError)) {
          const message =
            requestError.response?.data?.message;

          setError(
            typeof message === 'string'
              ? message
              : 'No fue posible cargar las versiones.',
          );
        } else {
          setError(
            'No fue posible cargar las versiones.',
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, [documentId]);

  useFocusEffect(
    useCallback(() => {
      void loadVersions();
    }, [loadVersions]),
  );

  const handleOpenFile = async (
    version: CaseDocumentVersion,
  ) => {
    try {
      setProcessingVersionId(version.id);

      const file =
        await downloadProtectedFile(
          caseDocumentsService.getDownloadPath(
            version.id,
          ),
          version.originalName,
        );

      await openFileWithCompatibleApp({
        uri: file.uri,
        mimeType: version.mimeType,
      });
    } catch (requestError) {
      Alert.alert(
        'No fue posible abrir el archivo',
        requestError instanceof Error
          ? requestError.message
          : 'No se encontró una aplicación compatible.',
      );
    } finally {
      setProcessingVersionId(null);
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
          Cargando versiones...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            void loadVersions();
          }}
        >
          <Text style={styles.retryButtonText}>
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            void loadVersions();
          }}
        />
      }
    >
      <Text style={styles.title}>
        {documentName ??
          'Versiones del documento'}
      </Text>

      <Text style={styles.subtitle}>
        Consulta y abre los archivos disponibles
        en el expediente.
      </Text>

      {versions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No se encontraron versiones.
          </Text>
        </View>
      ) : (
        versions.map((version) => {
          const isProcessing =
            processingVersionId ===
            version.id;

          return (
            <View
              key={version.id}
              style={styles.versionCard}
            >
              <View style={styles.versionHeader}>
                <View style={styles.versionInformation}>
                  <Text style={styles.versionTitle}>
                    Versión {version.versionNumber}
                  </Text>

                  <Text style={styles.fileName}>
                    {version.originalName}
                  </Text>
                </View>

                <View style={styles.versionBadge}>
                  <Text
                    style={
                      styles.versionBadgeText
                    }
                  >
                    v{version.versionNumber}
                  </Text>
                </View>
              </View>

              <Text style={styles.detailText}>
                Tipo: {version.mimeType}
              </Text>

              <Text style={styles.detailText}>
                Tamaño:{' '}
                {formatFileSize(
                  version.sizeBytes,
                )}
              </Text>

              <Text style={styles.detailText}>
                Subido por:{' '}
                {version.uploadedBy.firstName}{' '}
                {version.uploadedBy.lastName}
              </Text>

              <Text style={styles.detailText}>
                Fecha:{' '}
                {new Date(
                  version.createdAt,
                ).toLocaleString('es-MX')}
              </Text>

              {version.notes ? (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>
                    Notas
                  </Text>

                  <Text style={styles.notesText}>
                    {version.notes}
                  </Text>
                </View>
              ) : null}

              <Pressable
                disabled={isProcessing}
                style={[
                  styles.openButton,
                  isProcessing &&
                    styles.disabledButton,
                ]}
                onPress={() =>
                  void handleOpenFile(version)
                }
              >
                {isProcessing ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={styles.openButtonText}
                  >
                    Abrir con...
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })
      )}
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
    textAlign: 'center',
    color: '#C53030',
  },

  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A365D',
  },

  subtitle: {
    marginTop: 7,
    color: '#718096',
    lineHeight: 20,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },

  emptyText: {
    color: '#718096',
  },

  versionCard: {
    marginTop: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },

  versionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  versionInformation: {
    flex: 1,
  },

  versionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2D3748',
  },

  fileName: {
    marginTop: 5,
    color: '#4A5568',
  },

  versionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#EBF8FF',
  },

  versionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  detailText: {
    marginTop: 7,
    fontSize: 13,
    color: '#718096',
  },

  notesContainer: {
    marginTop: 12,
    padding: 11,
    borderRadius: 9,
    backgroundColor: '#F7FAFC',
  },

  notesLabel: {
    fontWeight: '700',
    color: '#4A5568',
  },

  notesText: {
    marginTop: 4,
    color: '#4A5568',
    lineHeight: 19,
  },

  openButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
    marginTop: 15,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  openButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },
});