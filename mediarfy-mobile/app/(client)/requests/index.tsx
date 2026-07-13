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
  SUBMITTED: 'Enviada',
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

export default function RequestsScreen() {
  const router = useRouter();

  const [requests, setRequests] = useState<
    MediationRequest[]
  >([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadRequests = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError(null);

      try {
        const data =
          await mediationRequestsService.getMine();

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Cargando solicitudes...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.createButton}
        onPress={() =>
          router.push('/(client)/requests/create')
        }
      >
        <Text style={styles.createButtonText}>
          Nueva solicitud
        </Text>
      </Pressable>

      {error ? (
        <View style={styles.errorContainer}>
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              Todavía no tienes solicitudes
            </Text>

            <Text style={styles.emptyText}>
              Crea una solicitud para comenzar un proceso
              de mediación.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() =>
              router.push({
                pathname:
                  '/(client)/requests/[id]',
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

            <Text style={styles.cardTitle}>
              {item.title}
            </Text>

            <Text
              style={styles.description}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.metaText}>
                Urgencia: {urgencyLabels[item.urgency]}
              </Text>

              <Text style={styles.metaText}>
                {new Date(
                  item.createdAt,
                ).toLocaleDateString()}
              </Text>
            </View>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#667085',
  },
  createButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1A365D',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },
  description: {
    color: '#667085',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 13,
    color: '#667085',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#172033',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#667085',
    lineHeight: 20,
  },
  errorContainer: {
    gap: 8,
    marginBottom: 16,
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
});