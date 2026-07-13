import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { mediationRequestsService } from '../../../src/services/mediation-requests.service';
import {
  MediationRequest,
  MediationRequestStatus,
  UrgencyLevel,
} from '../../../src/types/mediation-request.types';

const statusLabels: Record<
  MediationRequestStatus,
  string
> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Nueva',
  UNDER_REVIEW: 'En revisión',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

const urgencyLabels: Record<UrgencyLevel, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export default function MediatorRequestsScreen() {
  const router = useRouter();

  const [requests, setRequests] = useState<
    MediationRequest[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const loadRequests = useCallback(
    async (refreshing = false) => {
      refreshing
        ? setIsRefreshing(true)
        : setIsLoading(true);

      setError(null);

      try {
        const data =
          await mediationRequestsService.getPending();

        setRequests(data);
      } catch {
        setError(
          'No fue posible cargar las solicitudes',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Cargando solicitudes...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={() => void loadRequests()}
          >
            <Text style={styles.retryText}>
              Volver a intentar
            </Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          requests.length === 0
            ? styles.emptyList
            : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() =>
              void loadRequests(true)
            }
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>
              No hay solicitudes pendientes
            </Text>

            <Text style={styles.emptyText}>
              Las nuevas solicitudes aparecerán aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname:
                  '/(mediator)/requests/[id]',
                params: {
                  id: item.id,
                },
              })
            }
          >
            <View style={styles.cardHeader}>
              <Text style={styles.folio}>
                {item.folio}
              </Text>

              <Text style={styles.status}>
                {statusLabels[item.status]}
              </Text>
            </View>

            <Text style={styles.title}>
              {item.title}
            </Text>

            <Text
              style={styles.description}
              numberOfLines={3}
            >
              {item.description}
            </Text>

            <View style={styles.footer}>
              <Text style={styles.metaText}>
                Urgencia:{' '}
                {urgencyLabels[item.urgency]}
              </Text>

              <Text style={styles.metaText}>
                {new Date(
                  item.createdAt,
                ).toLocaleDateString()}
              </Text>
            </View>

            {item.assignedMediator ? (
              <Text style={styles.assignedText}>
                Asignada a:{' '}
                {item.assignedMediator.firstName}{' '}
                {item.assignedMediator.lastName}
              </Text>
            ) : (
              <Text style={styles.availableText}>
                Disponible para revisión
              </Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: '#F4F7FA',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#667085',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
  },
  card: {
    gap: 10,
    marginBottom: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  folio: {
    flex: 1,
    fontWeight: '700',
    color: '#1A365D',
  },
  status: {
    fontWeight: '700',
    color: '#344054',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },
  description: {
    color: '#667085',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 13,
    color: '#667085',
  },
  availableText: {
    fontWeight: '700',
    color: '#067647',
  },
  assignedText: {
    fontWeight: '600',
    color: '#B54708',
  },
  errorBox: {
    gap: 8,
    marginBottom: 14,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FEE4E2',
  },
  errorText: {
    color: '#B42318',
  },
  retryText: {
    fontWeight: '700',
    color: '#B42318',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: '#667085',
  },
});