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

import { caseInvitationsService } from '../../../src/services/case-invitations.service';
import {
  InvitationParticipantRole,
} from '../../../src/types/case-invitation.types';

const roleLabels: Record<
  InvitationParticipantRole,
  string
> = {
  INVITED_PARTY: 'Parte invitada',
  LEGAL_REPRESENTATIVE: 'Representante legal',
  LAWYER: 'Abogado',
  OBSERVER: 'Observador',
};

const availableRoles: InvitationParticipantRole[] = [
  'INVITED_PARTY',
  'LEGAL_REPRESENTATIVE',
  'LAWYER',
  'OBSERVER',
];

export default function InviteParticipantScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    caseId?: string | string[];
  }>();

  const caseId = Array.isArray(params.caseId)
    ? params.caseId[0]
    : params.caseId;

  const [email, setEmail] = useState('');

  const [participantRole, setParticipantRole] =
    useState<InvitationParticipantRole>(
      'INVITED_PARTY',
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const validateForm = (): string | null => {
    if (!caseId) {
      return 'No se recibió el identificador del caso';
    }

    if (!email.trim()) {
      return 'Escribe el correo electrónico';
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      return 'El correo electrónico no es válido';
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

    if (!caseId) {
      return;
    }

    try {
      setIsSubmitting(true);

      await caseInvitationsService.create(
        caseId,
        {
          email: email.trim().toLowerCase(),
          participantRole,
        },
      );

      Alert.alert(
        'Invitación creada',
        'La invitación fue registrada correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const apiMessage =
          requestError.response?.data?.message;

        Alert.alert(
          'No fue posible crear la invitación',
          Array.isArray(apiMessage)
            ? apiMessage.join('\n')
            : typeof apiMessage === 'string'
              ? apiMessage
              : 'Ocurrió un error al crear la invitación',
        );

        return;
      }

      Alert.alert(
        'No fue posible crear la invitación',
        'Ocurrió un error inesperado',
      );
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
        Invitar participante
      </Text>

      <Text style={styles.subtitle}>
        Ingresa el correo de una persona registrada en Mediarfy para invitarla a participar en este caso.
      </Text>

      <Text style={styles.label}>
        Correo electrónico
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        editable={!isSubmitting}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
        placeholder="persona@correo.com"
      />

      <Text style={styles.label}>
        Rol dentro del caso
      </Text>

      <View style={styles.rolesContainer}>
        {availableRoles.map((role) => {
          const isSelected =
            participantRole === role;

          return (
            <Pressable
              key={role}
              disabled={isSubmitting}
              style={[
                styles.roleButton,
                isSelected &&
                  styles.selectedRoleButton,
              ]}
              onPress={() =>
                setParticipantRole(role)
              }
            >
              <Text
                style={[
                  styles.roleButtonText,
                  isSelected &&
                    styles.selectedRoleButtonText,
                ]}
              >
                {roleLabels[role]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>
          Rol seleccionado
        </Text>

        <Text style={styles.helpText}>
          {participantRole ===
          'INVITED_PARTY'
            ? 'Persona directamente involucrada como contraparte.'
            : participantRole ===
                'LEGAL_REPRESENTATIVE'
              ? 'Persona autorizada para representar legalmente a una parte.'
              : participantRole ===
                  'LAWYER'
                ? 'Profesional jurídico que asesora a una de las partes.'
                : 'Persona con acceso de consulta al expediente.'}
        </Text>
      </View>

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
            Crear invitación
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
    marginBottom: 10,
    color: '#718096',
    lineHeight: 21,
  },

  label: {
    marginTop: 17,
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

  rolesContainer: {
    gap: 9,
  },

  roleButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  selectedRoleButton: {
    borderColor: '#1A365D',
    backgroundColor: '#1A365D',
  },

  roleButtonText: {
    fontWeight: '600',
    color: '#4A5568',
  },

  selectedRoleButtonText: {
    color: '#FFFFFF',
  },

  helpContainer: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#EBF8FF',
  },

  helpTitle: {
    fontWeight: '700',
    color: '#2C5282',
  },

  helpText: {
    marginTop: 5,
    color: '#4A5568',
    lineHeight: 20,
  },

  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 28,
    paddingHorizontal: 18,
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