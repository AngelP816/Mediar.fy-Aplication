import { Stack } from 'expo-router';

export default function MediatorRequestsLayout() {
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
          title: 'Solicitudes disponibles',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Revisar solicitud',
        }}
      />
    </Stack>
  );
}