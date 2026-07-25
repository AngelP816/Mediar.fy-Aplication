import { Stack } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useAuthStore } from '../src/stores/auth.store';
import { useNotificationsSocket } from '../src/hooks/use-notifications-socket';
import * as Notifications from 'expo-notifications';
import { registerCurrentDevicePushToken } from '../src/services/push-notifications.service';
import { usePushNotificationNavigation } from '../src/hooks/use-push-notification-navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

  useNotificationsSocket({
    enabled: !isInitializing && isAuthenticated && user !== null,
  });
  usePushNotificationNavigation();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (
      isInitializing ||
      !isAuthenticated ||
      !user
    ) {
      return;
    }

    const registerPushToken =
      async () => {
        try {
          const token =
            await registerCurrentDevicePushToken();

          console.log(
            'Expo Push Token registrado:',
            token,
          );
        } catch (error) {
          /*
           * No cerramos la sesión si el registro push falla.
           * Las notificaciones no deben bloquear el acceso.
           */
          console.log(
            'No fue posible registrar el token push:',
            error,
          );
        }
      };

    void registerPushToken();
  }, [
    isInitializing,
    isAuthenticated,
    user?.id,
  ]);

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