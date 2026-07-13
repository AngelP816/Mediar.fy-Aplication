import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

export default function IndexScreen() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  if (user.role === 'CLIENT') {
    return <Redirect href="/(client)" />;
  }

  if (user.role === 'MEDIATOR') {
    return <Redirect href="/(mediator)" />;
  }

  return <Redirect href="/(admin)" />;
} 