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
    </Stack>
  );
}