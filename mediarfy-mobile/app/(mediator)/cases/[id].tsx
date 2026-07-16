import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { casesService } from '../../../src/services/cases.service';
import {
  CaseStatus,
  MediationCaseDetail,
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

interface CaseAction {
  label: string;
  nextStatus: CaseStatus;
  destructive?: boolean;
}

const actionsByStatus: Record<
  CaseStatus,
  CaseAction[]
> = {
  OPEN: [
    {
      label: 'Solicitar información',
      nextStatus: 'INFORMATION_PENDING',
    },
    {
      label: 'Programar sesión',
      nextStatus: 'SESSION_SCHEDULED',
    },
    {
      label: 'Cancelar caso',
      nextStatus: 'CANCELLED',
      destructive: true,
    },
  ],

  INFORMATION_PENDING: [
    {
      label: 'Programar sesión',
      nextStatus: 'SESSION_SCHEDULED',
    },
    {
      label: 'Cancelar caso',
      nextStatus: 'CANCELLED',
      destructive: true,
    },
  ],

  SESSION_SCHEDULED: [
    {
      label: 'Iniciar mediación',
      nextStatus: 'IN_MEDIATION',
    },
    {
      label: 'Solicitar más información',
      nextStatus: 'INFORMATION_PENDING',
    },
    {
      label: 'Cancelar caso',
      nextStatus: 'CANCELLED',
      destructive: true,
    },
  ],

  IN_MEDIATION: [
    {
      label: 'Redactar convenio',
      nextStatus: 'AGREEMENT_DRAFTING',
    },
    {
      label: 'Cerrar sin acuerdo',
      nextStatus: 'CLOSED_NO_AGREEMENT',
      destructive: true,
    },
    {
      label: 'Cancelar caso',
      nextStatus: 'CANCELLED',
      destructive: true,
    },
  ],

  AGREEMENT_DRAFTING: [
    {
      label: 'Enviar a firmas',
      nextStatus: 'AWAITING_SIGNATURES',
    },
    {
      label: 'Regresar a mediación',
      nextStatus: 'IN_MEDIATION',
    },
    {
      label: 'Cerrar sin acuerdo',
      nextStatus: 'CLOSED_NO_AGREEMENT',
      destructive: true,
    },
  ],

  AWAITING_SIGNATURES: [
    {
      label: 'Marcar como firmado',
      nextStatus: 'SIGNED',
    },
    {
      label: 'Regresar a redacción',
      nextStatus: 'AGREEMENT_DRAFTING',
    },
    {
      label: 'Cerrar sin acuerdo',
      nextStatus: 'CLOSED_NO_AGREEMENT',
      destructive: true,
    },
  ],

  SIGNED: [
    {
      label: 'Enviar a registro',
      nextStatus: 'REGISTRATION_PENDING',
    },
  ],

  REGISTRATION_PENDING: [
    {
      label: 'Cerrar con acuerdo',
      nextStatus: 'CLOSED_SUCCESS',
    },
  ],

  CLOSED_SUCCESS: [],
  CLOSED_NO_AGREEMENT: [],
  CANCELLED: [],
};

export default function MediatorCaseDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const caseId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const [mediationCase, setMediationCase] =
    useState<MediationCaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null,);

  const [selectedAction, setSelectedAction] =
    useState<CaseAction | null>(null);

  const [comment, setComment] = useState('');

  const [isUpdating, setIsUpdating] =
    useState(false);

  const availableActions = useMemo(() => {
    if (!mediationCase) {
      return [];
    }

    return actionsByStatus[mediationCase.status];
  }, [mediationCase]);

  const handleUpdateStatus = async () => {
    if (
      !caseId ||
      !selectedAction ||
      !mediationCase
    ) {
      return;
    }

    try {
      setIsUpdating(true);

      const updatedCase =
        await casesService.updateStatus(
          caseId,
          {
            status: selectedAction.nextStatus,
            comment: comment.trim() || undefined,
          },
        );

      setMediationCase(updatedCase);
      setSelectedAction(null);
      setComment('');

      Alert.alert(
        'Estado actualizado',
        `El caso ahora se encuentra en: ${statusLabels[updatedCase.status]
        }`,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiMessage =
          error.response?.data?.message;

        Alert.alert(
          'No fue posible actualizar',
          typeof apiMessage === 'string'
            ? apiMessage
            : 'Ocurrió un error al actualizar el caso',
        );
      } else {
        Alert.alert(
          'No fue posible actualizar',
          'Ocurrió un error inesperado',
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

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

  useFocusEffect(
    useCallback(() => {
      void loadCase();
    }, [loadCase]),
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

      {availableActions.length > 0 ? (
        <Section title="Acciones del caso">
          <Text style={styles.actionHelp}>
            Selecciona la siguiente etapa del expediente.
          </Text>

          {availableActions.map((action) => (
            <Pressable
              key={action.nextStatus}
              style={[
                styles.actionButton,
                action.destructive &&
                styles.destructiveButton,
              ]}
              onPress={() => {
                setSelectedAction(action);
                setComment('');
              }}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  action.destructive &&
                  styles.destructiveButtonText,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </Section>
      ) : (
        <Section title="Estado del caso">
          <Text style={styles.finishedText}>
            Este expediente se encuentra en un estado
            final y ya no admite cambios.
          </Text>
        </Section>
      )}

      <Modal
        visible={selectedAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isUpdating) {
            setSelectedAction(null);
            setComment('');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Actualizar estado
            </Text>

            <Text style={styles.modalDescription}>
              El caso cambiará de{' '}
              <Text style={styles.boldText}>
                {mediationCase
                  ? statusLabels[mediationCase.status]
                  : ''}
              </Text>{' '}
              a{' '}
              <Text style={styles.boldText}>
                {selectedAction
                  ? statusLabels[
                  selectedAction.nextStatus
                  ]
                  : ''}
              </Text>
              .
            </Text>

            <Text style={styles.inputLabel}>
              Comentario
            </Text>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Describe el motivo o detalle del cambio"
              multiline
              maxLength={500}
              editable={!isUpdating}
              style={styles.commentInput}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {comment.length}/500
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                disabled={isUpdating}
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedAction(null);
                  setComment('');
                }}
              >
                <Text style={styles.cancelButtonText}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                disabled={isUpdating}
                style={[
                  styles.confirmButton,
                  isUpdating &&
                  styles.disabledButton,
                ]}
                onPress={() =>
                  void handleUpdateStatus()
                }
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Confirmar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  actionHelp: {
    marginBottom: 14,
    color: '#718096',
    lineHeight: 20,
  },

  actionButton: {
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1A365D',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  destructiveButton: {
    borderWidth: 1,
    borderColor: '#C53030',
    backgroundColor: '#FFFFFF',
  },

  destructiveButtonText: {
    color: '#C53030',
  },

  finishedText: {
    color: '#718096',
    lineHeight: 21,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  modalContainer: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A202C',
  },

  modalDescription: {
    marginTop: 10,
    color: '#4A5568',
    lineHeight: 21,
  },

  boldText: {
    fontWeight: '700',
    color: '#2D3748',
  },

  inputLabel: {
    marginTop: 18,
    marginBottom: 7,
    fontWeight: '600',
    color: '#2D3748',
  },

  commentInput: {
    minHeight: 110,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    color: '#1A202C',
  },

  characterCount: {
    marginTop: 5,
    textAlign: 'right',
    fontSize: 12,
    color: '#A0AEC0',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 10,
  },

  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#EDF2F7',
  },

  cancelButtonText: {
    color: '#4A5568',
    fontWeight: '700',
  },

  confirmButton: {
    minWidth: 110,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },
});