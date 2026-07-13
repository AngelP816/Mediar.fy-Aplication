import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { mediationRequestsService } from '../../../src/services/mediation-requests.service';
import {
  MediationRequest,
  MediationRequestStatus,
} from '../../../src/types/mediation-request.types';

const statusLabels: Record<
  MediationRequestStatus,
  string
> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviada',
  UNDER_REVIEW: 'En revisión',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

export default function RequestDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const requestId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [request, setRequest] =
    useState<MediationRequest | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    const loadRequest = async () => {
      if (!requestId) {
        setError('La solicitud no es válida');
        setIsLoading(false);
        return;
      }

      try {
        const data =
          await mediationRequestsService.getById(
            requestId,
          );

        setRequest(data);
      } catch {
        setError(
          'No fue posible cargar la solicitud',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadRequest();
  }, [requestId]);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>
          {error ?? 'Solicitud no encontrada'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <Text style={styles.folio}>
          {request.folio}
        </Text>

        <Text style={styles.title}>
          {request.title}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>
            Estado
          </Text>

          <Text style={styles.value}>
            {statusLabels[request.status]}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            Urgencia
          </Text>

          <Text style={styles.value}>
            {request.urgency}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            Tipo
          </Text>

          <Text style={styles.value}>
            {request.type}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Descripción
        </Text>

        <Text style={styles.description}>
          {request.description}
        </Text>

        <Text style={styles.sectionTitle}>
          Mediador asignado
        </Text>

        <Text style={styles.description}>
          {request.assignedMediator
            ? `${request.assignedMediator.firstName} ${request.assignedMediator.lastName}`
            : 'Todavía no se ha asignado un mediador'}
        </Text>

        {request.rejectionReason ? (
          <>
            <Text style={styles.sectionTitle}>
              Motivo del rechazo
            </Text>

            <Text style={styles.rejectionText}>
              {request.rejectionReason}
            </Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  content: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    gap: 14,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  folio: {
    fontWeight: '700',
    color: '#1A365D',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#172033',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    fontWeight: '700',
    color: '#344054',
  },
  value: {
    flex: 1,
    textAlign: 'right',
    color: '#667085',
  },
  sectionTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
  },
  description: {
    color: '#667085',
    lineHeight: 22,
  },
  rejectionText: {
    color: '#B42318',
    lineHeight: 22,
  },
  error: {
    textAlign: 'center',
    color: '#B42318',
  },
});