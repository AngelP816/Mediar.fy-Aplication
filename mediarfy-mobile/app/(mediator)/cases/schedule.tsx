import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import axios from 'axios';

import { sessionsService } from '../../../src/services/sessions.service';
import {
  SessionModality,
} from '../../../src/types/session.types';

const modalityLabels: Record<
  SessionModality,
  string
> = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
};

export default function ScheduleSessionScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    caseId?: string | string[];
  }>();

  const caseId = Array.isArray(params.caseId)
    ? params.caseId[0]
    : params.caseId;

  const [title, setTitle] = useState(
    'Sesión de mediación',
  );

  const [description, setDescription] =
    useState('');

  const [scheduledAt, setScheduledAt] =
    useState(() => {
      const date = new Date();

      date.setDate(date.getDate() + 1);
      date.setHours(10, 0, 0, 0);

      return date;
    });

  const [durationMinutes, setDurationMinutes] =
    useState('60');

  const [modality, setModality] =
    useState<SessionModality>('VIRTUAL');

  const [location, setLocation] = useState('');
  const [meetingUrl, setMeetingUrl] =
    useState('');
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [showTimePicker, setShowTimePicker] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const formattedDate = useMemo(
    () =>
      scheduledAt.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [scheduledAt],
  );

  const formattedTime = useMemo(
    () =>
      scheduledAt.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [scheduledAt],
  );

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (
      event.type === 'dismissed' ||
      !selectedDate
    ) {
      return;
    }

    const nextDate = new Date(scheduledAt);

    nextDate.setFullYear(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    setScheduledAt(nextDate);
  };

  const handleTimeChange = (
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (
      event.type === 'dismissed' ||
      !selectedTime
    ) {
      return;
    }

    const nextDate = new Date(scheduledAt);

    nextDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0,
    );

    setScheduledAt(nextDate);
  };

  const validateForm = (): string | null => {
    if (!caseId) {
      return 'No se recibió el identificador del caso';
    }

    if (!title.trim()) {
      return 'Escribe el título de la sesión';
    }

    if (scheduledAt.getTime() <= Date.now()) {
      return 'La sesión debe programarse para una fecha futura';
    }

    const duration = Number(durationMinutes);

    if (
      !Number.isInteger(duration) ||
      duration < 15 ||
      duration > 480
    ) {
      return 'La duración debe estar entre 15 y 480 minutos';
    }

    if (
      modality === 'IN_PERSON' &&
      !location.trim()
    ) {
      return 'Escribe la ubicación de la sesión presencial';
    }

    if (
      modality === 'VIRTUAL' &&
      !meetingUrl.trim()
    ) {
      return 'Escribe el enlace de la sesión virtual';
    }

    if (
      modality === 'HYBRID' &&
      (!location.trim() ||
        !meetingUrl.trim())
    ) {
      return 'La sesión híbrida requiere ubicación y enlace';
    }

    if (
      (modality === 'VIRTUAL' ||
        modality === 'HYBRID') &&
      !/^https?:\/\/.+/i.test(
        meetingUrl.trim(),
      )
    ) {
      return 'El enlace debe comenzar con http:// o https://';
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

      await sessionsService.create(caseId, {
        title: title.trim(),
        description:
          description.trim() || undefined,
        scheduledAt:
          scheduledAt.toISOString(),
        durationMinutes:
          Number(durationMinutes),
        modality,
        location:
          modality === 'IN_PERSON' ||
          modality === 'HYBRID'
            ? location.trim()
            : undefined,
        meetingUrl:
          modality === 'VIRTUAL' ||
          modality === 'HYBRID'
            ? meetingUrl.trim()
            : undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Sesión programada',
        'La sesión fue registrada correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiMessage =
          error.response?.data?.message;

        Alert.alert(
          'No fue posible programar la sesión',
          Array.isArray(apiMessage)
            ? apiMessage.join('\n')
            : typeof apiMessage === 'string'
              ? apiMessage
              : 'Ocurrió un error al registrar la sesión',
        );
      } else {
        Alert.alert(
          'No fue posible programar la sesión',
          'Ocurrió un error inesperado',
        );
      }
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
      <Text style={styles.label}>
        Título
      </Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        editable={!isSubmitting}
        maxLength={150}
        style={styles.input}
        placeholder="Título de la sesión"
      />

      <Text style={styles.label}>
        Descripción
      </Text>

      <TextInput
        value={description}
        onChangeText={setDescription}
        editable={!isSubmitting}
        maxLength={1000}
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          styles.multilineInput,
        ]}
        placeholder="Descripción o propósito de la sesión"
      />

      <Text style={styles.label}>
        Fecha
      </Text>

      <Pressable
        style={styles.selector}
        onPress={() =>
          setShowDatePicker(true)
        }
      >
        <Text style={styles.selectorText}>
          {formattedDate}
        </Text>
      </Pressable>

      {showDatePicker ? (
        <DateTimePicker
          value={scheduledAt}
          mode="date"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      ) : null}

      <Text style={styles.label}>
        Hora
      </Text>

      <Pressable
        style={styles.selector}
        onPress={() =>
          setShowTimePicker(true)
        }
      >
        <Text style={styles.selectorText}>
          {formattedTime}
        </Text>
      </Pressable>

      {showTimePicker ? (
        <DateTimePicker
          value={scheduledAt}
          mode="time"
          onChange={handleTimeChange}
        />
      ) : null}

      <Text style={styles.label}>
        Duración en minutos
      </Text>

      <TextInput
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        editable={!isSubmitting}
        keyboardType="number-pad"
        maxLength={3}
        style={styles.input}
        placeholder="60"
      />

      <Text style={styles.label}>
        Modalidad
      </Text>

      <View style={styles.optionsContainer}>
        {(
          [
            'IN_PERSON',
            'VIRTUAL',
            'HYBRID',
          ] as SessionModality[]
        ).map((option) => {
          const isSelected =
            modality === option;

          return (
            <Pressable
              key={option}
              style={[
                styles.optionButton,
                isSelected &&
                  styles.selectedOption,
              ]}
              onPress={() =>
                setModality(option)
              }
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected &&
                    styles.selectedOptionText,
                ]}
              >
                {modalityLabels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {modality === 'IN_PERSON' ||
      modality === 'HYBRID' ? (
        <>
          <Text style={styles.label}>
            Ubicación
          </Text>

          <TextInput
            value={location}
            onChangeText={setLocation}
            editable={!isSubmitting}
            maxLength={300}
            style={styles.input}
            placeholder="Sala, oficina o dirección"
          />
        </>
      ) : null}

      {modality === 'VIRTUAL' ||
      modality === 'HYBRID' ? (
        <>
          <Text style={styles.label}>
            Enlace de reunión
          </Text>

          <TextInput
            value={meetingUrl}
            onChangeText={setMeetingUrl}
            editable={!isSubmitting}
            autoCapitalize="none"
            keyboardType="url"
            style={styles.input}
            placeholder="https://meet.google.com/..."
          />
        </>
      ) : null}

      <Text style={styles.label}>
        Notas
      </Text>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        editable={!isSubmitting}
        maxLength={1000}
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          styles.multilineInput,
        ]}
        placeholder="Información adicional para la sesión"
      />

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
            Programar sesión
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

  label: {
    marginTop: 16,
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

  multilineInput: {
    minHeight: 100,
  },

  selector: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  selectorText: {
    color: '#2D3748',
  },

  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },

  selectedOption: {
    borderColor: '#1A365D',
    backgroundColor: '#1A365D',
  },

  optionText: {
    color: '#4A5568',
    fontWeight: '600',
  },

  selectedOptionText: {
    color: '#FFFFFF',
  },

  submitButton: {
    alignItems: 'center',
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1A365D',
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  disabledButton: {
    opacity: 0.6,
  },
});