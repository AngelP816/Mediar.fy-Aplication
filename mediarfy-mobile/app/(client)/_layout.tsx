import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsStore } from '../../src/stores/notifications.store';

export default function ClientLayout() {
  const unreadCount =
    useNotificationsStore(
      (state) =>
        state.unreadCount,
    );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A365D',
        tabBarInactiveTintColor: '#718096',
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="home-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="document-text-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="cases"
        options={{
          title: 'Casos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="folder-open-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="invitations"
        options={{
          title: 'Invitaciones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-add-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Avisos',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'notifications'
                  : 'notifications-outline'
              }
              color={color}
              size={size}
            />
          ),

          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? '99+'
                : unreadCount
              : undefined,
        }}
      />
    </Tabs>
  );
}