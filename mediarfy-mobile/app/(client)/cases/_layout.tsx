import { Stack } from 'expo-router';

export default function ClientCasesLayout() {
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
          title: 'Mis casos',
        }}
      />

      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalle del caso',
        }}
      />

      <Stack.Screen
        name="documents/[documentId]"
        options={{
          title: 'Versiones del documento',
        }}
      />

      <Stack.Screen
        name="chat/[conversationId]"
        options={{
          title: 'Conversación',
        }}
      />
    </Stack>
  );
}