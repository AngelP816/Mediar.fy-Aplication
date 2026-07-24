import { useCallback, useState } from 'react';
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
  useRouter,
} from 'expo-router';
import axios from 'axios';

import { caseInvitationsService } from '../../../src/services/case-invitations.service';
import {
  CaseInvitation,
  CaseInvitationStatus,
  InvitationParticipantRole,
} from '../../../src/types/case-invitation.types';

const statusLabels: Record<
  CaseInvitationStatus,
  string
> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
};

const roleLabels: Record<
  InvitationParticipantRole,
  string
> = {
  INVITED_PARTY: 'Parte invitada',
  LEGAL_REPRESENTATIVE: 'Representante legal',
  LAWYER: 'Abogado',
  OBSERVER: 'Observador',
};

export default function InvitationsScreen() {
  const router = useRouter();

  const [invitations, setInvitations] =
    useState<CaseInvitation[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    processingInvitationId,
    setProcessingInvitationId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadInvitations =
    useCallback(async () => {
      try {
        setError(null);

        const data =
          await caseInvitationsService.getMine();

        setInvitations(data);
      } catch (requestError) {
        console.log(
          'Error cargando invitaciones:',
          requestError,
        );

        if (axios.isAxiosError(requestError)) {
          const apiMessage =
            requestError.response?.data?.message;

          setError(
            typeof apiMessage === 'string'
              ? apiMessage
              : 'No fue posible cargar las invitaciones',
          );
        } else {
          setError(
            'No fue posible cargar las invitaciones',
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void loadInvitations();
    }, [loadInvitations]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadInvitations();
  };

  const handleAccept = (
    invitation: CaseInvitation,
  ) => {
    Alert.alert(
      'Aceptar invitación',
      `¿Deseas participar en el caso ${invitation.mediationCase.folio} como ${roleLabels[invitation.participantRole]}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Aceptar',
          onPress: () => {
            void acceptInvitation(invitation.id);
          },
        },
      ],
    );
  };

  const acceptInvitation = async (
    invitationId: string,
  ) => {
    try {
      setProcessingInvitationId(
        invitationId,
      );

      await caseInvitationsService.accept(
        invitationId,
      );

      await loadInvitations();

      Alert.alert(
        'Invitación aceptada',
        'El caso ya está disponible en tu lista de casos.',
        [
          {
            text: 'Ver casos',
            onPress: () =>
              router.push('/(client)/cases'),
          },
          {
            text: 'Cerrar',
          },
        ],
      );
    } catch (requestError) {
      showRequestError(
        requestError,
        'No fue posible aceptar la invitación',
      );
    } finally {
      setProcessingInvitationId(null);
    }
  };

  const handleReject = (
    invitation: CaseInvitation,
  ) => {
    Alert.alert(
      'Rechazar invitación',
      `¿Seguro que deseas rechazar la invitación al caso ${invitation.mediationCase.folio}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => {
            void rejectInvitation(invitation.id);
          },
        },
      ],
    );
  };

  const rejectInvitation = async (
    invitationId: string,
  ) => {
    try {
      setProcessingInvitationId(
        invitationId,
      );

      await caseInvitationsService.reject(
        invitationId,
      );

      await loadInvitations();

      Alert.alert(
        'Invitación rechazada',
        'La invitación fue rechazada correctamente.',
      );
    } catch (requestError) {
      showRequestError(
        requestError,
        'No fue posible rechazar la invitación',
      );
    } finally {
      setProcessingInvitationId(null);
    }
  };

  const showRequestError = (
    requestError: unknown,
    fallbackMessage: string,
  ) => {
    if (axios.isAxiosError(requestError)) {
      const apiMessage =
        requestError.response?.data?.message;

      Alert.alert(
        'Ocurrió un problema',
        Array.isArray(apiMessage)
          ? apiMessage.join('\n')
          : typeof apiMessage === 'string'
            ? apiMessage
            : fallbackMessage,
      );

      return;
    }

    Alert.alert(
      'Ocurrió un problema',
      fallbackMessage,
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#1A365D"
        />

        <Text style={styles.loadingText}>
          Cargando invitaciones...
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
            void loadInvitations();
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
          onRefresh={handleRefresh}
        />
      }
    >
      <Text style={styles.title}>
        Mis invitaciones
      </Text>

      <Text style={styles.subtitle}>
        Consulta las invitaciones que has
        recibido para participar en casos de
        mediación.
      </Text>

      {invitations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>
            No tienes invitaciones
          </Text>

          <Text style={styles.emptyText}>
            Cuando un mediador te invite a un
            caso, aparecerá en esta sección.
          </Text>
        </View>
      ) : (
        invitations.map((invitation) => {
          const isProcessing =
            processingInvitationId ===
            invitation.id;

          const isPending =
            invitation.status === 'PENDING';

          return (
            <View
              key={invitation.id}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerContent}>
                  <Text style={styles.folio}>
                    {
                      invitation
                        .mediationCase.folio
                    }
                  </Text>

                  <Text style={styles.caseTitle}>
                    {
                      invitation
                        .mediationCase.title
                    }
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusBadgeStyle(
                      invitation.status,
                    ),
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      getStatusTextStyle(
                        invitation.status,
                      ),
                    ]}
                  >
                    {
                      statusLabels[
                        invitation.status
                      ]
                    }
                  </Text>
                </View>
              </View>

              <InfoRow
                label="Rol asignado"
                value={
                  roleLabels[
                    invitation.participantRole
                  ]
                }
              />

              <InfoRow
                label="Mediador"
                value={`${invitation.mediationCase.mediator.firstName} ${invitation.mediationCase.mediator.lastName}`}
              />

              <InfoRow
                label="Invitado por"
                value={`${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`}
              />

              <InfoRow
                label="Fecha de invitación"
                value={new Date(
                  invitation.createdAt,
                ).toLocaleString('es-MX')}
              />

              <InfoRow
                label="Vigencia"
                value={new Date(
                  invitation.expiresAt,
                ).toLocaleString('es-MX')}
              />

              {invitation.mediationCase
                .description ? (
                <View style={styles.description}>
                  <Text
                    style={
                      styles.descriptionLabel
                    }
                  >
                    Descripción
                  </Text>

                  <Text
                    style={
                      styles.descriptionText
                    }
                  >
                    {
                      invitation
                        .mediationCase
                        .description
                    }
                  </Text>
                </View>
              ) : null}

              {isPending ? (
                <View style={styles.actions}>
                  <Pressable
                    disabled={isProcessing}
                    style={[
                      styles.acceptButton,
                      isProcessing &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      handleAccept(invitation)
                    }
                  >
                    {isProcessing ? (
                      <ActivityIndicator
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.acceptButtonText
                        }
                      >
                        Aceptar
                      </Text>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={isProcessing}
                    style={[
                      styles.rejectButton,
                      isProcessing &&
                        styles.disabledButton,
                    ]}
                    onPress={() =>
                      handleReject(invitation)
                    }
                  >
                    <Text
                      style={
                        styles.rejectButtonText
                      }
                    >
                      Rechazar
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {invitation.status ===
              'ACCEPTED' ? (
                <Pressable
                  style={styles.viewCaseButton}
                  onPress={() =>
                    router.push({
                      pathname:
                        '/(client)/cases/[id]',
                      params: {
                        id: invitation.caseId,
                      },
                    })
                  }
                >
                  <Text
                    style={
                      styles.viewCaseButtonText
                    }
                  >
                    Ver caso
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
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

function getStatusBadgeStyle(
  status: CaseInvitationStatus,
) {
  switch (status) {
    case 'ACCEPTED':
      return styles.acceptedBadge;

    case 'REJECTED':
    case 'CANCELLED':
      return styles.rejectedBadge;

    case 'EXPIRED':
      return styles.expiredBadge;

    default:
      return styles.pendingBadge;
  }
}

function getStatusTextStyle(
  status: CaseInvitationStatus,
) {
  switch (status) {
    case 'ACCEPTED':
      return styles.acceptedStatusText;

    case 'REJECTED':
    case 'CANCELLED':
      return styles.rejectedStatusText;

    case 'EXPIRED':
      return styles.expiredStatusText;

    default:
      return styles.pendingStatusText;
  }
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

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A365D',
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: '#718096',
    lineHeight: 21,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },

  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#718096',
    lineHeight: 20,
  },

  card: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  headerContent: {
    flex: 1,
  },

  folio: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  caseTitle: {
    marginTop: 4,
    fontSize: 19,
    fontWeight: '700',
    color: '#1A202C',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  pendingBadge: {
    backgroundColor: '#FEFCBF',
  },

  pendingStatusText: {
    color: '#975A16',
  },

  acceptedBadge: {
    backgroundColor: '#C6F6D5',
  },

  acceptedStatusText: {
    color: '#276749',
  },

  rejectedBadge: {
    backgroundColor: '#FED7D7',
  },

  rejectedStatusText: {
    color: '#C53030',
  },

  expiredBadge: {
    backgroundColor: '#E2E8F0',
  },

  expiredStatusText: {
    color: '#4A5568',
  },

  infoRow: {
    marginTop: 14,
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },

  infoValue: {
    marginTop: 3,
    color: '#2D3748',
  },

  description: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
  },

  descriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
  },

  descriptionText: {
    marginTop: 5,
    color: '#4A5568',
    lineHeight: 20,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },

  acceptButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1A365D',
  },

  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  rejectButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#C53030',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  rejectButtonText: {
    color: '#C53030',
    fontWeight: '700',
  },

  viewCaseButton: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EBF8FF',
  },

  viewCaseButtonText: {
    color: '#2B6CB0',
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },

  errorText: {
    color: '#C53030',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});