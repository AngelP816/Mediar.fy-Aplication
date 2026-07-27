import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuthStore } from '../stores/auth.store';
import { useChatStore } from '../stores/chat.store';

import type {
  ChatConversationStatus,
  ChatConversationSummary,
} from '../types/chat.types';

const statusLabels: Record<ChatConversationStatus, string> = {
  ACTIVE: 'Activa',
  CLOSED: 'Cerrada',
  ARCHIVED: 'Archivada',
};

function formatConversationDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return new Intl.DateTimeFormat(
    'es-MX',
    isToday
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          day: '2-digit',
          month: 'short',
        },
  ).format(date);
}

function getSenderName(conversation: ChatConversationSummary): string {
  const sender = conversation.lastMessage?.sender;

  if (!sender) {
    return conversation.lastMessage ? 'Sistema' : 'Sin mensajes';
  }

  return `${sender.firstName} ${sender.lastName}`.trim();
}

export function ChatConversationsScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const conversations = useChatStore((state) => state.conversations);
  const isLoading = useChatStore(
    (state) => state.isLoadingConversations,
  );
  const isLoadingMore = useChatStore(
    (state) => state.isLoadingMoreConversations,
  );
  const error = useChatStore((state) => state.conversationsError);
  const loadConversations = useChatStore(
    (state) => state.loadConversations,
  );
  const loadMoreConversations = useChatStore(
    (state) => state.loadMoreConversations,
  );

  useFocusEffect(
    useCallback(() => {
      void loadConversations();
    }, [loadConversations]),
  );

  const openConversation = (conversationId: string) => {
    if (role === 'MEDIATOR') {
      router.push({
        pathname: '/(mediator)/cases/chat/[conversationId]',
        params: {
          conversationId,
        },
      });
      return;
    }

    router.push({
      pathname: '/(client)/cases/chat/[conversationId]',
      params: {
        conversationId,
      },
    });
  };

  if (isLoading && conversations.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>
          Cargando conversaciones...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && conversations.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              void loadConversations();
            }}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            conversations.length === 0
              ? styles.emptyList
              : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                void loadConversations();
              }}
            />
          }
          onEndReached={() => {
            void loadMoreConversations();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                style={styles.footerLoader}
                size="small"
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                Aún no hay conversaciones
              </Text>
              <Text style={styles.emptyText}>
                Los chats aparecerán cuando se abra una conversación desde
                alguno de tus casos.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const lastActivityAt =
              item.lastMessage?.createdAt ?? item.updatedAt;

            return (
              <Pressable
                style={styles.card}
                onPress={() => openConversation(item.id)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.folio}>{item.case.folio}</Text>
                  <Text style={styles.date}>
                    {formatConversationDate(lastActivityAt)}
                  </Text>
                </View>

                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.case.title}
                  </Text>

                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.sender} numberOfLines={1}>
                  {getSenderName(item)}
                </Text>

                <Text style={styles.preview} numberOfLines={2}>
                  {item.lastMessage?.content ?? 'No hay mensajes todavía.'}
                </Text>

                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {statusLabels[item.status]}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#4A5568',
  },
  list: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folio: {
    color: '#2B6CB0',
    fontSize: 13,
    fontWeight: '700',
  },
  date: {
    color: '#718096',
    fontSize: 12,
  },
  titleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    color: '#1A202C',
    fontSize: 17,
    fontWeight: '700',
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    marginLeft: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#C53030',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sender: {
    marginTop: 8,
    color: '#2D3748',
    fontSize: 13,
    fontWeight: '600',
  },
  preview: {
    marginTop: 3,
    color: '#718096',
    lineHeight: 19,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EBF8FF',
  },
  statusText: {
    color: '#2C5282',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#2D3748',
    fontSize: 19,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 8,
    color: '#718096',
    lineHeight: 20,
    textAlign: 'center',
  },
  errorContainer: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: '#C53030',
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#C53030',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  footerLoader: {
    marginVertical: 16,
  },
});
