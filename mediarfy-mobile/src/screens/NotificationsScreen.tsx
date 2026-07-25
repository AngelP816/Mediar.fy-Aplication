import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
  useRouter,
} from 'expo-router';

import axios from 'axios';

import {
  notificationsService,
} from '../services/notifications.service';

import type {
  AppNotification,
} from '../types/notification.types';

import {
  getNotificationSymbol,
  notificationTypeLabels,
} from '../utils/notification.util';

import {
  useNotificationsStore,
} from '../stores/notifications.store';

interface NotificationsScreenProps {
  role: 'client' | 'mediator';
}

export default function NotificationsScreen({
  role,
}: NotificationsScreenProps) {
  const router = useRouter();

  const notifications =
    useNotificationsStore(
      (state) =>
        state.notifications,
    );

  const setNotifications =
    useNotificationsStore(
      (state) =>
        state.setNotifications,
    );

  const updateNotification =
    useNotificationsStore(
      (state) =>
        state.updateNotification,
    );

  const removeNotification =
    useNotificationsStore(
      (state) =>
        state.removeNotification,
    );

  const unreadCount =
    useNotificationsStore(
      (state) =>
        state.unreadCount,
    );

  const setUnreadCount =
    useNotificationsStore(
      (state) =>
        state.setUnreadCount,
    );

  const isSocketConnected =
    useNotificationsStore(
      (state) =>
        state.isSocketConnected,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [
    processingNotificationId,
    setProcessingNotificationId,
  ] = useState<string | null>(null);

  const [isMarkingAll, setIsMarkingAll] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadNotifications =
    useCallback(async () => {
      try {
        setError(null);

        const data =
          await notificationsService.getMine();

        setNotifications(data);
      } catch (requestError) {
        console.log(
          'Error cargando notificaciones:',
          requestError,
        );

        if (axios.isAxiosError(requestError)) {
          const message =
            requestError.response?.data
              ?.message;

          setError(
            typeof message === 'string'
              ? message
              : 'No fue posible cargar las notificaciones.',
          );
        } else {
          setError(
            'No fue posible cargar las notificaciones.',
          );
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const markNotificationAsRead =
    async (
      notification: AppNotification,
    ): Promise<void> => {
      if (notification.status !== 'UNREAD') {
        return;
      }

      const updated =
        await notificationsService.markAsRead(
          notification.id,
        );

      updateNotification(updated);
      setUnreadCount(
        Math.max(
          unreadCount - 1,
          0,
        ),
      );
    };

  const navigateToRelatedContent = (
    notification: AppNotification,
  ) => {
    if (
      notification.type ===
      'INVITATION_CREATED' &&
      role === 'client'
    ) {
      router.push(
        '../(client)/invitations',
      );

      return;
    }

    if (!notification.caseId) {
      return;
    }

    if (role === 'mediator') {
      router.push({
        pathname:
          '/(mediator)/cases/[id]',
        params: {
          id: notification.caseId,
        },
      });

      return;
    }

    router.push({
      pathname:
        '/(client)/cases/[id]',
      params: {
        id: notification.caseId,
      },
    });
  };

  const handleOpenNotification =
    async (
      notification: AppNotification,
    ) => {
      try {
        setProcessingNotificationId(
          notification.id,
        );

        await markNotificationAsRead(
          notification,
        );

        navigateToRelatedContent(
          notification,
        );
      } catch (requestError) {
        Alert.alert(
          'No fue posible abrir la notificación',
          axios.isAxiosError(requestError) &&
            typeof requestError.response
              ?.data?.message === 'string'
            ? requestError.response.data
              .message
            : 'Ocurrió un error inesperado.',
        );
      } finally {
        setProcessingNotificationId(
          null,
        );
      }
    };

  const handleMarkAllAsRead =
    async () => {
      if (unreadCount === 0) {
        return;
      }

      try {
        setIsMarkingAll(true);

        await notificationsService.markAllAsRead();

        const readAt =
          new Date().toISOString();

        setNotifications(
          notifications.map(
            (notification) =>
              notification.status ===
                'UNREAD'
                ? {
                  ...notification,
                  status:
                    'READ' as const,
                  readAt,
                }
                : notification,
          ),
        );

        setUnreadCount(0);
      } catch (requestError) {
        Alert.alert(
          'No fue posible actualizar',
          axios.isAxiosError(requestError) &&
            typeof requestError.response
              ?.data?.message === 'string'
            ? requestError.response.data
              .message
            : 'No fue posible marcar las notificaciones como leídas.',
        );
      } finally {
        setIsMarkingAll(false);
      }
    };

  const handleArchive = (
    notification: AppNotification,
  ) => {
    Alert.alert(
      'Archivar notificación',
      'La notificación dejará de aparecer en esta lista.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Archivar',
          onPress: async () => {
            try {
              setProcessingNotificationId(
                notification.id,
              );

              await notificationsService.archive(
                notification.id,
              );

              removeNotification(
                notification.id,
              );
              if (
                notification.status ===
                'UNREAD'
              ) {
                setUnreadCount(
                  Math.max(
                    unreadCount - 1,
                    0,
                  ),
                );
              }
            } catch (requestError) {
              Alert.alert(
                'No fue posible archivar',
                axios.isAxiosError(
                  requestError,
                ) &&
                  typeof requestError
                    .response?.data
                    ?.message === 'string'
                  ? requestError.response
                    .data.message
                  : 'Ocurrió un error al archivar la notificación.',
              );
            } finally {
              setProcessingNotificationId(
                null,
              );
            }
          },
        },
      ],
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadNotifications();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#1A365D"
        />

        <Text style={styles.loadingText}>
          Cargando notificaciones...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            void loadNotifications();
          }}
        >
          <Text
            style={styles.retryButtonText}
          >
            Reintentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerInformation}>
          <Text style={styles.title}>
            Notificaciones
          </Text>

          <Text style={styles.subtitle}>
            {unreadCount === 0
              ? 'No tienes notificaciones pendientes.'
              : `${unreadCount} notificación${unreadCount === 1
                ? ''
                : 'es'
              } sin leer.`}
          </Text>
        </View>

        {unreadCount > 0 ? (
          <Pressable
            disabled={isMarkingAll}
            style={[
              styles.markAllButton,
              isMarkingAll &&
              styles.disabledButton,
            ]}
            onPress={() =>
              void handleMarkAllAsRead()
            }
          >
            {isMarkingAll ? (
              <ActivityIndicator
                size="small"
                color="#2B6CB0"
              />
            ) : (
              <Text
                style={
                  styles.markAllButtonText
                }
              >
                Leer todas
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptySymbol}>
            ✓
          </Text>

          <Text style={styles.emptyTitle}>
            Todo al día
          </Text>

          <Text style={styles.emptyText}>
            Las nuevas actualizaciones de tus
            casos aparecerán aquí.
          </Text>
        </View>
      ) : (
        notifications.map(
          (notification) => {
            const isUnread =
              notification.status ===
              'UNREAD';

            const isProcessing =
              processingNotificationId ===
              notification.id;

            return (
              <View
                key={notification.id}
                style={[
                  styles.notificationCard,
                  isUnread &&
                  styles.unreadNotificationCard,
                ]}
              >
                <Pressable
                  disabled={isProcessing}
                  style={
                    styles.notificationContent
                  }
                  onPress={() =>
                    void handleOpenNotification(
                      notification,
                    )
                  }
                >
                  <View
                    style={
                      styles.notificationHeader
                    }
                  >
                    <View
                      style={[
                        styles.symbolContainer,
                        isUnread &&
                        styles.unreadSymbolContainer,
                      ]}
                    >
                      <Text
                        style={
                          styles.notificationSymbol
                        }
                      >
                        {getNotificationSymbol(
                          notification.type,
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.notificationInformation
                      }
                    >
                      <View
                        style={
                          styles.titleContainer
                        }
                      >
                        <Text
                          style={[
                            styles.notificationTitle,
                            isUnread &&
                            styles.unreadNotificationTitle,
                          ]}
                        >
                          {notification.title}
                        </Text>

                        {isUnread ? (
                          <View
                            style={
                              styles.unreadDot
                            }
                          />
                        ) : null}
                      </View>

                      <Text
                        style={
                          styles.notificationType
                        }
                      >
                        {
                          notificationTypeLabels[
                          notification.type
                          ]
                        }
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.notificationMessage
                    }
                  >
                    {notification.message}
                  </Text>

                  <Text
                    style={
                      styles.notificationDate
                    }
                  >
                    {new Date(
                      notification.createdAt,
                    ).toLocaleString(
                      'es-MX',
                    )}
                  </Text>

                  {notification.caseId ? (
                    <Text
                      style={
                        styles.openHint
                      }
                    >
                      Toca para abrir el caso
                    </Text>
                  ) : null}
                </Pressable>

                <View
                  style={
                    styles.notificationActions
                  }
                >
                  {isUnread ? (
                    <Pressable
                      disabled={isProcessing}
                      style={
                        styles.readButton
                      }
                      onPress={() =>
                        void (async () => {
                          try {
                            setProcessingNotificationId(
                              notification.id,
                            );

                            await markNotificationAsRead(
                              notification,
                            );
                          } catch {
                            Alert.alert(
                              'Error',
                              'No fue posible marcar la notificación como leída.',
                            );
                          } finally {
                            setProcessingNotificationId(
                              null,
                            );
                          }
                        })()
                      }
                    >
                      <Text
                        style={
                          styles.readButtonText
                        }
                      >
                        Marcar como leída
                      </Text>
                    </Pressable>
                  ) : null}

                  <Pressable
                    disabled={isProcessing}
                    style={
                      styles.archiveButton
                    }
                    onPress={() =>
                      handleArchive(
                        notification,
                      )
                    }
                  >
                    {isProcessing ? (
                      <ActivityIndicator
                        size="small"
                        color="#718096"
                      />
                    ) : (
                      <Text
                        style={
                          styles.archiveButtonText
                        }
                      >
                        Archivar
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          },
        )
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7FAFC',
  },

  loadingText: {
    marginTop: 12,
    color: '#4A5568',
  },

  errorText: {
    textAlign: 'center',
    color: '#C53030',
  },

  retryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: '#1A365D',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  headerInformation: {
    flex: 1,
  },

  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#1A365D',
  },

  subtitle: {
    marginTop: 6,
    color: '#718096',
  },

  markAllButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 9,
    backgroundColor: '#EBF8FF',
  },

  markAllButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  notificationCard: {
    marginTop: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },

  unreadNotificationCard: {
    borderColor: '#90CDF4',
    backgroundColor: '#F7FCFF',
  },

  notificationContent: {
    padding: 14,
  },

  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  symbolContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EDF2F7',
  },

  unreadSymbolContainer: {
    backgroundColor: '#EBF8FF',
  },

  notificationSymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  notificationInformation: {
    flex: 1,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  notificationTitle: {
    flex: 1,
    fontSize: 16,
    color: '#4A5568',
  },

  unreadNotificationTitle: {
    fontWeight: '700',
    color: '#1A202C',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3182CE',
  },

  notificationType: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#2B6CB0',
  },

  notificationMessage: {
    marginTop: 11,
    color: '#4A5568',
    lineHeight: 20,
  },

  notificationDate: {
    marginTop: 10,
    fontSize: 12,
    color: '#A0AEC0',
  },

  openHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#2B6CB0',
  },

  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
    backgroundColor: '#FAFAFA',
  },

  readButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#2B6CB0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },

  readButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2B6CB0',
  },

  archiveButton: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },

  archiveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 30,
    padding: 25,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },

  emptySymbol: {
    fontSize: 34,
    color: '#2F855A',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 19,
    fontWeight: '700',
    color: '#2D3748',
  },

  emptyText: {
    marginTop: 7,
    textAlign: 'center',
    color: '#718096',
    lineHeight: 20,
  },

  disabledButton: {
    opacity: 0.55,
  },
});