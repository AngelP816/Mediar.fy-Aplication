import { router } from 'expo-router';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuthStore } from '../../src/stores/auth.store';

export default function ClientHomeScreen() {
  const user = useAuthStore(
    (state) => state.user,
  );

  const logout = useAuthStore(
    (state) => state.logout,
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Hola, {user?.firstName}
        </Text>

        <Text style={styles.subtitle}>
          Gestiona tus solicitudes de mediación
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Solicitudes de mediación
        </Text>

        <Text style={styles.cardText}>
          Consulta tus solicitudes o registra una nueva.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push('/(client)/requests')
          }
        >
          <Text style={styles.primaryButtonText}>
            Ver mis solicitudes
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            router.push('/(client)/requests/create')
          }
        >
          <Text style={styles.secondaryButtonText}>
            Crear nueva solicitud
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={() => void logout()}
      >
        <Text style={styles.logoutButtonText}>
          Cerrar sesión
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#F4F7FA',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#172033',
  },
  subtitle: {
    marginTop: 6,
    color: '#667085',
  },
  card: {
    gap: 14,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#172033',
  },
  cardText: {
    color: '#667085',
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#1A365D',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1A365D',
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#1A365D',
    fontWeight: '700',
  },
  logoutButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: '#B42318',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});