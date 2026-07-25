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
import { useFocusEffect, useRouter } from 'expo-router';
import { casesService } from '../../../src/services/cases.service';
import {
  CaseStatus,
  MediationCase,
} from '../../../src/types/case.types';

const statusLabels: Record<CaseStatus, string> = {
  OPEN: 'Abierto',
  INFORMATION_PENDING: 'Información pendiente',
  SESSION_SCHEDULED: 'Sesión programada',
  IN_MEDIATION: 'En mediación',
  AGREEMENT_DRAFTING: 'Redacción de convenio',
  AWAITING_SIGNATURES: 'Esperando firmas',
  SIGNED: 'Firmado',
  REGISTRATION_PENDING: 'Registro pendiente',
  CLOSED_SUCCESS: 'Cerrado con acuerdo',
  CLOSED_NO_AGREEMENT: 'Cerrado sin acuerdo',
  CANCELLED: 'Cancelado',
};

export default function ClientCasesScreen() {
  const router = useRouter();

  const [cases, setCases] = useState<MediationCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  const loadCases = useCallback(async () => {
    try {
      setError(null);

      const data = await casesService.getMine();

      setCases(data);
    } catch (requestError) {
      console.log(
        'Error cargando casos:',
        requestError,
      );

      setError(
        'No fue posible cargar tus casos de mediación',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCases();
    }, [loadCases]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadCases();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Cargando casos...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis casos</Text>

      <Text style={styles.subtitle}>
        Consulta los casos de mediación que tienes asignados.
      </Text>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => void loadCases()}
          >
            <Text style={styles.retryButtonText}>
              Reintentar
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
          contentContainerStyle={
            cases.length === 0
              ? styles.emptyList
              : styles.list
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                Todavía no tienes casos
              </Text>

              <Text style={styles.emptyText}>
                Cuando un mediador acepte una de tus
                solicitudes, el caso aparecerá aquí.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(mediator)/cases/[id]',
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

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {statusLabels[item.status]}
                  </Text>
                </View>
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

              <Text style={styles.metaText}>
                Cliente: {item.client.firstName}{' '}
                {item.client.lastName}
              </Text>

              <Text style={styles.metaText}>
                Apertura:{' '}
                {new Date(
                  item.openedAt,
                ).toLocaleDateString()}
              </Text>
            </Pressable>
            
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7FAFC',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#4A5568',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A365D',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: '#4A5568',
    lineHeight: 20,
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folio: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B6CB0',
  },
  statusBadge: {
    maxWidth: '55%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C5282',
    textAlign: 'center',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  description: {
    marginTop: 6,
    marginBottom: 12,
    color: '#4A5568',
    lineHeight: 20,
  },
  metaText: {
    marginTop: 4,
    fontSize: 13,
    color: '#718096',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#718096',
    lineHeight: 20,
  },
  errorContainer: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#C53030',
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#C53030',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});