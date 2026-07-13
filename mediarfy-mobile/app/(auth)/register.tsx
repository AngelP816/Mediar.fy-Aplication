import { Link } from 'expo-router';
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
import { useAuthStore } from '../../src/stores/auth.store';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const isSubmitting = useAuthStore(
    (state) => state.isSubmitting,
  );
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore(
    (state) => state.clearError,
  );

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] =
    useState('');
  const [localError, setLocalError] = useState<string | null>(
    null,
  );

  const handleRegister = async (): Promise<void> => {
    clearError();
    setLocalError(null);

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !password ||
      !passwordConfirmation
    ) {
      setLocalError('Completa todos los campos obligatorios');
      return;
    }

    if (phone.trim() && !/^[0-9]{10}$/.test(phone.trim())) {
      setLocalError('El teléfono debe contener 10 dígitos');
      return;
    }

    if (password !== passwordConfirmation) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
      });
    } catch {
      // El store conserva el mensaje enviado por la API.
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>Mediar.fy</Text>

          <Text style={styles.title}>Crear cuenta</Text>

          <Text style={styles.subtitle}>
            Regístrate como cliente para iniciar una solicitud
            de mediación
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isSubmitting}
          />

          <TextInput
            style={styles.input}
            placeholder="Apellidos"
            value={lastName}
            onChangeText={setLastName}
            editable={!isSubmitting}
          />

          <TextInput
            style={styles.input}
            placeholder="Teléfono, opcional"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            editable={!isSubmitting}
          />

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!isSubmitting}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!isSubmitting}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmar contraseña"
            secureTextEntry
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
            editable={!isSubmitting}
          />

          {localError ? (
            <Text style={styles.error}>{localError}</Text>
          ) : null}

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Pressable
            style={[
              styles.button,
              isSubmitting && styles.buttonDisabled,
            ]}
            onPress={() => void handleRegister()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                Crear cuenta
              </Text>
            )}
          </Pressable>

          <View style={styles.loginRow}>
            <Text>¿Ya tienes una cuenta? </Text>

            <Link href="/login" style={styles.link}>
              Inicia sesión
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    gap: 14,
    padding: 24,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A365D',
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#172033',
  },
  subtitle: {
    color: '#667085',
    lineHeight: 20,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1A365D',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  error: {
    color: '#B42318',
    lineHeight: 20,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  link: {
    color: '#1A365D',
    fontWeight: '700',
  },
});