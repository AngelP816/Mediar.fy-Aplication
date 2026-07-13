import { Stack } from 'expo-router';

export default function AdministratorLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Panel del Admin' }}
      />
    </Stack>
  );
}