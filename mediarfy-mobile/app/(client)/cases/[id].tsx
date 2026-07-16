import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { casesService } from '../../../src/services/cases.service';
import {
  CaseStatus,
  MediationCaseDetail,
} from '../../../src/types/case.types';
import { sessionsService } from '../../../src/services/sessions.service';
import { MediationSession } from '../../../src/types/session.types';

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

export default function ClientCaseDetailScreen() {
  const [sessions, setSessions] =
    useState<MediationSession[]>([]);

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const caseId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [mediationCase, setMediationCase] =
    useState<MediationCaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null,
  );

  const [isLoadingSessions, setIsLoadingSessions] =
    useState(false);

  const loadCase = useCallback(async () => {
    if (!caseId) {
      setError('El caso no contiene un ID válido');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const data = await casesService.getById(caseId);

      setMediationCase(data);
    } catch (requestError) {
      console.log(
        'Error cargando caso:',
        requestError,
      );

      if (axios.isAxiosError(requestError)) {
        const message =
          requestError.response?.data?.message;

        setError(
          typeof message === 'string'
            ? message
            : 'No fue posible cargar el caso',
        );
      } else {
        setError('No fue posible cargar el caso');
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  const loadSessions = useCallback(async () => {
    if (!caseId) {
      return;
    }

    try {
      setIsLoadingSessions(true);

      const data =
        await sessionsService.getByCase(caseId);

      setSessions(data);
    } catch (error) {
      console.log(
        'Error cargando sesiones:',
        error,
      );
    } finally {
      setIsLoadingSessions(false);
    }
  }, [caseId]);

  useFocusEffect(
    useCallback(() => {
      void loadCase();
      void loadSessions();
    }, [loadCase, loadSessions]),
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Cargando expediente...
        </Text>
      </View>
    );
  }

  if (error || !mediationCase) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error ?? 'Caso no encontrado'}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            void loadCase();
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
    >
      <Text style={styles.folio}>
        {mediationCase.folio}
      </Text>

      <Text style={styles.title}>
        {mediationCase.title}
      </Text>

      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>
          {statusLabels[mediationCase.status]}
        </Text>
      </View>

      <Section title="Descripción">
        <Text style={styles.bodyText}>
          {mediationCase.description}
        </Text>
      </Section>

      <Section title="Información del expediente">
        <InfoRow
          label="Solicitud original"
          value={mediationCase.request.folio}
        />

        <InfoRow
          label="Tipo"
          value={mediationCase.request.type}
        />

        <InfoRow
          label="Urgencia"
          value={mediationCase.request.urgency}
        />

        <InfoRow
          label="Fecha de apertura"
          value={new Date(
            mediationCase.openedAt,
          ).toLocaleString()}
        />
      </Section>

      <Section title="Mediador asignado">
        <Text style={styles.personName}>
          {mediationCase.mediator.firstName}{' '}
          {mediationCase.mediator.lastName}
        </Text>

        <Text style={styles.personDetail}>
          {mediationCase.mediator.email}
        </Text>

        {mediationCase.mediator.phone ? (
          <Text style={styles.personDetail}>
            {mediationCase.mediator.phone}
          </Text>
        ) : null}
      </Section>

      <Section title="Participantes">
        {mediationCase.participants.map(
          (participant) => (
            <View
              key={participant.id}
              style={styles.participant}
            >
              <Text style={styles.personName}>
                {participant.firstName}{' '}
                {participant.lastName}
              </Text>

              <Text style={styles.personDetail}>
                Rol: {participant.role}
              </Text>

              {participant.email ? (
                <Text style={styles.personDetail}>
                  {participant.email}
                </Text>
              ) : null}
            </View>
          ),
        )}
      </Section>

      <Section title="Sesiones programadas">
        {isLoadingSessions ? (
          <ActivityIndicator />
        ) : sessions.length === 0 ? (
          <Text style={styles.emptySessionsText}>
            Todavía no hay sesiones programadas.
          </Text>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              style={styles.sessionCard}
            >
              <Text style={styles.sessionTitle}>
                {session.title}
              </Text>

              <Text style={styles.sessionDate}>
                {new Date(
                  session.scheduledAt,
                ).toLocaleString('es-MX')}
              </Text>

              <Text style={styles.sessionDetail}>
                Duración: {session.durationMinutes}{' '}
                minutos
              </Text>

              <Text style={styles.sessionDetail}>
                Modalidad:{' '}
                {session.modality === 'IN_PERSON'
                  ? 'Presencial'
                  : session.modality === 'VIRTUAL'
                    ? 'Virtual'
                    : 'Híbrida'}
              </Text>

              {session.location ? (
                <Text style={styles.sessionDetail}>
                  Ubicación: {session.location}
                </Text>
              ) : null}

              {session.meetingUrl ? (
                <Text style={styles.sessionDetail}>
                  Enlace: {session.meetingUrl}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </Section>

      <Section title="Historial del caso">
        {mediationCase.statusHistory.map(
          (history) => (
            <View
              key={history.id}
              style={styles.historyItem}
            >
              <Text style={styles.historyStatus}>
                {statusLabels[history.toStatus]}
              </Text>

              {history.comment ? (
                <Text style={styles.historyComment}>
                  {history.comment}
                </Text>
              ) : null}

              <Text style={styles.historyDate}>
                {new Date(
                  history.createdAt,
                ).toLocaleString()}
              </Text>

              <Text style={styles.historyUser}>
                Modificado por:{' '}
                {history.changedBy.firstName}{' '}
                {history.changedBy.lastName}
              </Text>
            </View>
          ),
        )}
      </Section>
    </ScrollView>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({
  title,
  children,
}: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {children}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
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
  },
  loadingText: {
    marginTop: 12,
    color: '#4A5568',
  },
  folio: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B6CB0',
  },
  title: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EBF8FF',
  },
  statusText: {
    color: '#2C5282',
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A365D',
  },
  bodyText: {
    color: '#4A5568',
    lineHeight: 22,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
  },
  infoValue: {
    marginTop: 3,
    color: '#2D3748',
  },
  participant: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  personName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  personDetail: {
    marginTop: 4,
    color: '#718096',
  },
  historyItem: {
    marginBottom: 14,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4299E1',
  },
  historyStatus: {
    fontWeight: '700',
    color: '#2D3748',
  },
  historyComment: {
    marginTop: 4,
    color: '#4A5568',
  },
  historyDate: {
    marginTop: 6,
    fontSize: 12,
    color: '#A0AEC0',
  },
  historyUser: {
    marginTop: 3,
    fontSize: 12,
    color: '#718096',
  },
  errorText: {
    color: '#C53030',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#C53030',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scheduleButton: {
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#1A365D',
  },

  scheduleButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  sessionsLoader: {
    marginTop: 18,
  },

  emptySessionsText: {
    marginTop: 16,
    color: '#718096',
    textAlign: 'center',
  },

  sessionCard: {
    marginTop: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
  },

  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },

  sessionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },

  sessionStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  sessionDate: {
    marginTop: 9,
    fontWeight: '600',
    color: '#2D3748',
  },

  sessionDetail: {
    marginTop: 5,
    color: '#4A5568',
  },

  sessionDescription: {
    marginTop: 10,
    color: '#4A5568',
    lineHeight: 20,
  },

  sessionNotes: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#718096',
  },
});