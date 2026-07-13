import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '../../src/stores/auth.store';

export default function LoginScreen() {
  const router =useRouter();
  const login = useAuthStore(
    (state) => state.login,
  );

  const isLoading = useAuthStore(
    (state) => state.isSubmitting,
  );

  const error = useAuthStore(
    (state) => state.error,
  );

  const clearError = useAuthStore(
    (state) => state.clearError,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] =
    useState('');

  const handleLogin = async () => {
  clearError();

  if (!email.trim() || !password) {
    return;
  }

  try {
    await login({
      email: email.trim().toLowerCase(),
      password,
    });

    router.replace('/(client)');
  } catch {
    // El error ya se muestra desde el store.
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
      <View style={styles.card}>
        <Text style={styles.brand}>Mediar.fy</Text>

        <Text style={styles.title}>
          Iniciar sesión
        </Text>

        <Text style={styles.subtitle}>
          Accede a tus casos de mediación
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[
            styles.button,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={() => void handleLogin()}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Ingresar
            </Text>
          )}
        </Pressable>

        <View style={styles.registerRow}>
          <Text>¿No tienes una cuenta? </Text>

          <Link
            href="/register"
            style={styles.link}
          >
            Regístrate
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F4F7FA',
  },
  card: {
    gap: 16,
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
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  link: {
    color: '#1A365D',
    fontWeight: '700',
  },
});