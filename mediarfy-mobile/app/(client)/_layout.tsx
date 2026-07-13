import { Stack } from 'expo-router';

export default function ClientLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerBackVisible: false,
        }}
      />

      <Stack.Screen
        name="requests/index"
        options={{
          title: 'Mis solicitudes',
        }}
      />

      <Stack.Screen
        name="requests/create"
        options={{
          title: 'Nueva solicitud',
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