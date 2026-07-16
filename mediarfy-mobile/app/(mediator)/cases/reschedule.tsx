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

export default function RescheduleSessionScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    sessionId?: string | string[];
    scheduledAt?: string | string[];
    durationMinutes?: string | string[];
  }>();

  const sessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;

  const initialScheduledAt = Array.isArray(
    params.scheduledAt,
  )
    ? params.scheduledAt[0]
    : params.scheduledAt;

  const initialDuration = Array.isArray(
    params.durationMinutes,
  )
    ? params.durationMinutes[0]
    : params.durationMinutes;

  const [scheduledAt, setScheduledAt] =
    useState(() => {
      const parsedDate = initialScheduledAt
        ? new Date(initialScheduledAt)
        : new Date();

      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.getTime() <= Date.now()
      ) {
        const futureDate = new Date();

        futureDate.setDate(
          futureDate.getDate() + 1,
        );

        futureDate.setHours(10, 0, 0, 0);

        return futureDate;
      }

      return parsedDate;
    });

  const [durationMinutes, setDurationMinutes] =
    useState(initialDuration ?? '60');

  const [comment, setComment] =
    useState('');

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

    const nextDate =
      new Date(scheduledAt);

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

    const nextDate =
      new Date(scheduledAt);

    nextDate.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0,
    );

    setScheduledAt(nextDate);
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      Alert.alert(
        'Error',
        'No se recibió el identificador de la sesión',
      );

      return;
    }

    if (
      scheduledAt.getTime() <= Date.now()
    ) {
      Alert.alert(
        'Fecha no válida',
        'Selecciona una fecha y hora futuras',
      );

      return;
    }

    const duration =
      Number(durationMinutes);

    if (
      !Number.isInteger(duration) ||
      duration < 15 ||
      duration > 480
    ) {
      Alert.alert(
        'Duración no válida',
        'La duración debe estar entre 15 y 480 minutos',
      );

      return;
    }

    try {
      setIsSubmitting(true);

      await sessionsService.reschedule(
        sessionId,
        {
          scheduledAt:
            scheduledAt.toISOString(),
          durationMinutes: duration,
          comment:
            comment.trim() || undefined,
        },
      );

      Alert.alert(
        'Sesión reprogramada',
        'La nueva fecha se guardó correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message;

        Alert.alert(
          'No fue posible reprogramar',
          Array.isArray(message)
            ? message.join('\n')
            : typeof message === 'string'
              ? message
              : 'Ocurrió un error al reprogramar la sesión',
        );
      } else {
        Alert.alert(
          'No fue posible reprogramar',
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
      <Text style={styles.title}>
        Reprogramar sesión
      </Text>

      <Text style={styles.label}>
        Nueva fecha
      </Text>

      <Pressable
        style={styles.selector}
        onPress={() =>
          setShowDatePicker(true)
        }
      >
        <Text>{formattedDate}</Text>
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
        Nueva hora
      </Text>

      <Pressable
        style={styles.selector}
        onPress={() =>
          setShowTimePicker(true)
        }
      >
        <Text>{formattedTime}</Text>
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
        keyboardType="number-pad"
        editable={!isSubmitting}
        style={styles.input}
      />

      <Text style={styles.label}>
        Motivo de la reprogramación
      </Text>

      <TextInput
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={500}
        editable={!isSubmitting}
        textAlignVertical="top"
        style={[
          styles.input,
          styles.commentInput,
        ]}
        placeholder="Describe el motivo del cambio"
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
            Guardar nueva fecha
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
    fontSize: 26,
    fontWeight: '700',
    color: '#1A365D',
  },

  label: {
    marginTop: 18,
    marginBottom: 7,
    fontWeight: '700',
    color: '#2D3748',
  },

  selector: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  commentInput: {
    minHeight: 110,
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
  },

  disabledButton: {
    opacity: 0.6,
  },
});