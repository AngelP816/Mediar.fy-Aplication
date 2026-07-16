import { Stack } from 'expo-router';

export default function ClientRequestsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1A365D',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mis solicitudes',
        }}
      />

      <Stack.Screen
        name="create"
        options={{
          title: 'Nueva solicitud',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalle de solicitud',
        }}
      />
    </Stack>
  );
}