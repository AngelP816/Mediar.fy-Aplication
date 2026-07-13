import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mediationRequestsService } from '../../../src/services/mediation-requests.service';
import {
  MediationType,
  UrgencyLevel,
} from '../../../src/types/mediation-request.types';

const mediationTypes: {
  value: MediationType;
  label: string;
}[] = [
  {
    value: 'LEASE',
    label: 'Arrendamiento',
  },
  {
    value: 'PURCHASE_SALE',
    label: 'Compraventa',
  },
  {
    value: 'PROPERTY_DELIVERY',
    label: 'Entrega de inmueble',
  },
  {
    value: 'CONTRACT_BREACH',
    label: 'Incumplimiento de contrato',
  },
  {
    value: 'NEIGHBOR_CONFLICT',
    label: 'Conflicto vecinal',
  },
  {
    value: 'OTHER',
    label: 'Otro',
  },
];

const urgencyLevels: {
  value: UrgencyLevel;
  label: string;
}[] = [
  {
    value: 'LOW',
    label: 'Baja',
  },
  {
    value: 'MEDIUM',
    label: 'Media',
  },
  {
    value: 'HIGH',
    label: 'Alta',
  },
];

export default function CreateRequestScreen() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] =
    useState('');

  const [type, setType] =
    useState<MediationType>('LEASE');

  const [urgency, setUrgency] =
    useState<UrgencyLevel>('MEDIUM');

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setError(null);

    if (title.trim().length < 5) {
      setError(
        'El título debe contener al menos 5 caracteres',
      );
      return;
    }

    if (description.trim().length < 20) {
      setError(
        'La descripción debe contener al menos 20 caracteres',
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const request =
        await mediationRequestsService.create({
          title: title.trim(),
          description: description.trim(),
          type,
          urgency,
        });

      router.replace({
        pathname: '/(client)/requests/[id]',
        params: {
          id: request.id,
        },
      });
    } catch {
      setError(
        'No fue posible registrar la solicitud',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          Título del conflicto
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ej. Incumplimiento de arrendamiento"
          value={title}
          onChangeText={setTitle}
          maxLength={150}
          editable={!isSubmitting}
        />

        <Text style={styles.label}>
          Descripción
        </Text>

        <TextInput
          style={[
            styles.input,
            styles.descriptionInput,
          ]}
          placeholder="Describe detalladamente la situación..."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={3000}
          textAlignVertical="top"
          editable={!isSubmitting}
        />

        <Text style={styles.counter}>
          {description.length}/3000
        </Text>

        <Text style={styles.label}>
          Tipo de mediación
        </Text>

        <View style={styles.optionsContainer}>
          {mediationTypes.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                type === option.value &&
                  styles.optionSelected,
              ]}
              onPress={() => setType(option.value)}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.optionText,
                  type === option.value &&
                    styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>
          Nivel de urgencia
        </Text>

        <View style={styles.optionsContainer}>
          {urgencyLevels.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                urgency === option.value &&
                  styles.optionSelected,
              ]}
              onPress={() =>
                setUrgency(option.value)
              }
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.optionText,
                  urgency === option.value &&
                    styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.submitButton,
            isSubmitting &&
              styles.submitButtonDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              Enviar solicitud
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  label: {
    marginTop: 18,
    marginBottom: 8,
    fontWeight: '700',
    color: '#344054',
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  descriptionInput: {
    minHeight: 150,
    paddingTop: 14,
  },
  counter: {
    marginTop: 6,
    textAlign: 'right',
    color: '#667085',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    borderColor: '#1A365D',
    backgroundColor: '#1A365D',
  },
  optionText: {
    color: '#344054',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    marginTop: 18,
    color: '#B42318',
    lineHeight: 20,
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    borderRadius: 12,
    backgroundColor: '#1A365D',
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});