import { Stack } from 'expo-router';

export default function MediatorLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Panel del mediador',
          headerBackVisible: false,
        }}
      />

      <Stack.Screen
        name="requests/index"
        options={{
          title: 'Solicitudes pendientes',
        }}
      />

      <Stack.Screen
        name="requests/[id]"
        options={{
          title: 'Detalle de solicitud',
        }}
      />
    </Stack>
  );
}