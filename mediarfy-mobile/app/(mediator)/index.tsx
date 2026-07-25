import { router } from 'expo-router';
import {
  Button,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuthStore } from '../../src/stores/auth.store';

export default function MediatorHomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Hola, {user?.firstName}
        </Text>

        <Text style={styles.subtitle}>
          Revisa y gestiona solicitudes de mediación
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Solicitudes pendientes
        </Text>

        <Text style={styles.cardText}>
          Consulta solicitudes nuevas o casos que ya
          tienes en revisión.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() =>
            router.push('/(mediator)/requests')
          }
        >
          <Text style={styles.primaryButtonText}>
            Ver solicitudes
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={() => void logout()}
      >
        <Text style={styles.logoutText}>
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
  logoutButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderRadius: 10,
    backgroundColor: '#B42318',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});