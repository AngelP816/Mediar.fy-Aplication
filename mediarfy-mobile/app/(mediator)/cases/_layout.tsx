import { Stack } from 'expo-router';

export default function MediatorCasesLayout() {
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
          title: 'Casos asignados',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalle del caso',
        }}
      />

      <Stack.Screen
        name="reschedule"
        options={{
          title: 'Reprogramar sesión',
        }}
      />

      <Stack.Screen
        name="invite"
        options={{
          title: 'Invitar participante',
        }}
      />

      <Stack.Screen
        name="documents/upload"
        options={{
          title: 'Subir documento',
        }}
      />

      <Stack.Screen
        name="documents/[documentId]"
        options={{
          title: 'Versiones del documento',
        }}
      />
    </Stack>

  );
}