import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
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
import { mediationRequestsService } from '../../../src/services/mediation-requests.service';
import {
  MediationRequestDetail,
  MediationRequestStatus,
} from '../../../src/types/mediation-request.types';
import { useAuthStore } from '../../../src/stores/auth.store';
import axios from 'axios';

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

export default function MediatorRequestDetailScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();

  const requestId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const currentUser = useAuthStore(
    (state) => state.user,
  );

  const [request, setRequest] =
    useState<MediationRequestDetail | null>(null);

  const [comment, setComment] = useState('');
  const [rejectionReason, setRejectionReason] =
    useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

const loadRequest = useCallback(async () => {
  console.log('ID recibido en la pantalla:', requestId);

  if (!requestId) {
    setError('La solicitud no contiene un identificador válido');
    setIsLoading(false);
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    const data =
      await mediationRequestsService.getById(requestId);

    console.log('Solicitud recibida:', data);

    setRequest(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('URL:', error.config?.url);
      console.log('Estado HTTP:', error.response?.status);
      console.log('Respuesta API:', error.response?.data);

      const apiMessage = error.response?.data?.message;

      setError(
        typeof apiMessage === 'string'
          ? apiMessage
          : 'No fue posible cargar la solicitud',
      );
    } else {
      console.log('Error desconocido:', error);

      setError('No fue posible cargar la solicitud');
    }
  } finally {
    setIsLoading(false);
  }
}, [requestId]);

  useFocusEffect(
    useCallback(() => {
      void loadRequest();
    }, [loadRequest]),
  );

  const handleStartReview = async () => {
    if (!requestId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updated =
        await mediationRequestsService.startReview(
          requestId,
        );

      setRequest(updated);
    } catch {
      setError(
        'No fue posible tomar la solicitud. Puede que otro mediador ya la esté revisando.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = () => {
    Alert.alert(
      'Aceptar solicitud',
      '¿Confirmas que deseas aceptar esta solicitud?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Aceptar',
          onPress: () => void submitDecision('ACCEPTED'),
        },
      ],
    );
  };

  const handleReject = () => {
    if (rejectionReason.trim().length < 10) {
      setError(
        'El motivo del rechazo debe contener al menos 10 caracteres',
      );
      return;
    }

    Alert.alert(
      'Rechazar solicitud',
      'Esta decisión quedará registrada en el historial.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: () => void submitDecision('REJECTED'),
        },
      ],
    );
  };

  const submitDecision = async (
    decision: 'ACCEPTED' | 'REJECTED',
  ) => {
    if (!requestId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await mediationRequestsService.decide(
        requestId,
        {
          decision,
          comment: comment.trim() || undefined,
          rejectionReason:
            decision === 'REJECTED'
              ? rejectionReason.trim()
              : undefined,
        },
      );

      Alert.alert(
        'Decisión registrada',
        decision === 'ACCEPTED'
          ? 'La solicitud fue aceptada.'
          : 'La solicitud fue rechazada.',
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace(
                '/(mediator)/requests',
              ),
          },
        ],
      );
    } catch {
      setError(
        'No fue posible registrar la decisión',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !request) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error}
        </Text>
      </View>
    );
  }

  if (!request) {
    return null;
  }

  const isAvailable =
    request.status === 'SUBMITTED' &&
    !request.assignedMediator;

  const isAssignedToCurrentUser =
    request.assignedMediator?.id === currentUser?.id;

  const canDecide =
    request.status === 'UNDER_REVIEW' &&
    isAssignedToCurrentUser;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.folio}>
          {request.folio}
        </Text>

        <Text style={styles.title}>
          {request.title}
        </Text>

        <Text style={styles.status}>
          Estado: {statusLabels[request.status]}
        </Text>

        <Text style={styles.sectionTitle}>
          Cliente
        </Text>

        <Text style={styles.text}>
          {request.client.firstName}{' '}
          {request.client.lastName}
        </Text>

        <Text style={styles.text}>
          {request.client.email}
        </Text>

        {request.client.phone ? (
          <Text style={styles.text}>
            {request.client.phone}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>
          Descripción
        </Text>

        <Text style={styles.description}>
          {request.description}
        </Text>

        <Text style={styles.sectionTitle}>
          Tipo y urgencia
        </Text>

        <Text style={styles.text}>
          {request.type} · {request.urgency}
        </Text>

        {isAvailable ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              void handleStartReview()
            }
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Tomar para revisión
              </Text>
            )}
          </Pressable>
        ) : null}

        {canDecide ? (
          <>
            <Text style={styles.sectionTitle}>
              Comentario del mediador
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
              ]}
              placeholder="Comentario opcional"
              value={comment}
              onChangeText={setComment}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting}
            />

            <Text style={styles.sectionTitle}>
              Motivo del rechazo
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
              ]}
              placeholder="Obligatorio solamente si rechazas"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              textAlignVertical="top"
              editable={!isSubmitting}
            />

            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            <Pressable
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                Aceptar solicitud
              </Text>
            </Pressable>

            <Pressable
              style={styles.rejectButton}
              onPress={handleReject}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                Rechazar solicitud
              </Text>
            </Pressable>
          </>
        ) : null}

        {!isAvailable && !canDecide ? (
          <Text style={styles.notice}>
            Esta solicitud no está disponible para que
            realices acciones.
          </Text>
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
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    gap: 12,
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
  status: {
    fontWeight: '700',
    color: '#344054',
  },
  sectionTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: '#172033',
  },
  text: {
    color: '#667085',
  },
  description: {
    color: '#667085',
    lineHeight: 22,
  },
  input: {
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#1A365D',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  acceptButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#067647',
  },
  rejectButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#B42318',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  notice: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    color: '#B54708',
    backgroundColor: '#FEF0C7',
  },
  errorText: {
    color: '#B42318',
    lineHeight: 20,
  },
});