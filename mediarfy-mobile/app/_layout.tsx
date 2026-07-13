import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useAuthStore } from '../src/stores/auth.store';

export default function RootLayout() {
  const isInitializing = useAuthStore(
    (state) => state.isInitializing,
  );

  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const user = useAuthStore((state) => state.user);

  const initialize = useAuthStore(
    (state) => state.initialize,
  );

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected
        guard={
          isAuthenticated &&
          user?.role === 'CLIENT'
        }
      >
        <Stack.Screen name="(client)" />
      </Stack.Protected>

      <Stack.Protected
        guard={
          isAuthenticated &&
          user?.role === 'MEDIATOR'
        }
      >
        <Stack.Screen name="(mediator)" />
      </Stack.Protected>

      <Stack.Protected
        guard={
          isAuthenticated &&
          user?.role === 'ADMIN'
        }
      >
        <Stack.Screen name="(admin)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});