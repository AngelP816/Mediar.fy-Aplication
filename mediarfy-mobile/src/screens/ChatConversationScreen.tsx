import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  useLocalSearchParams,
} from 'expo-router';

import {
  useAuthStore,
} from '../stores/auth.store';

import {
  useChatStore,
} from '../stores/chat.store';

import type {
  ChatMessage,
} from '../types/chat.types';

function formatMessageTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    'es-MX',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(value));
}

function getSenderName(
  message: ChatMessage,
): string {
  if (!message.sender) {
    return 'Sistema';
  }

  return [
    message.sender.firstName,
    message.sender.lastName,
  ]
    .filter(Boolean)
    .join(' ');
}

export function ChatConversationScreen() {
  const params =
    useLocalSearchParams<{
      conversationId?: string | string[];
    }>();

  const conversationId =
    Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : params.conversationId;

  const currentUser =
    useAuthStore(
      (state) => state.user,
    );

  const conversation =
    useChatStore(
      (state) => state.conversation,
    );

  const messages =
    useChatStore(
      (state) => state.messages,
    );

  const isLoading =
    useChatStore(
      (state) => state.isLoading,
    );

  const isLoadingMore =
    useChatStore(
      (state) => state.isLoadingMore,
    );

  const isSending =
    useChatStore(
      (state) => state.isSending,
    );

  const isConnected =
    useChatStore(
      (state) => state.isConnected,
    );

  const hasMore =
    useChatStore(
      (state) => state.hasMore,
    );

  const error =
    useChatStore(
      (state) => state.error,
    );

  const loadConversation =
    useChatStore(
      (state) => state.loadConversation,
    );

  const connectConversation =
    useChatStore(
      (state) => state.connectConversation,
    );

  const loadMoreMessages =
    useChatStore(
      (state) => state.loadMoreMessages,
    );

  const sendMessage =
    useChatStore(
      (state) => state.sendMessage,
    );

  const markAsRead =
    useChatStore(
      (state) => state.markAsRead,
    );

  const closeConversation =
    useChatStore(
      (state) => state.closeConversation,
    );

  const clearError =
    useChatStore(
      (state) => state.clearError,
    );

  const [content, setContent] =
    useState('');

  const listRef =
    useRef<FlatList<ChatMessage>>(
      null,
    );

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    let isMounted = true;

    const initializeChat =
      async () => {
        try {
          await loadConversation(
            conversationId,
          );

          if (!isMounted) {
            return;
          }

          await connectConversation(
            conversationId,
          );

          if (!isMounted) {
            return;
          }

          await markAsRead();
        } catch (loadError) {
          console.log(
            'No fue posible iniciar el chat:',
            loadError,
          );
        }
      };

    void initializeChat();

    return () => {
      isMounted = false;
      closeConversation();
    };
  }, [
    conversationId,
    loadConversation,
    connectConversation,
    markAsRead,
    closeConversation,
  ]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const timer =
      setTimeout(() => {
        listRef.current
          ?.scrollToEnd({
            animated: true,
          });
      }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [messages.length]);

  const handleSend =
    useCallback(async () => {
      const trimmedContent =
        content.trim();

      if (
        !trimmedContent ||
        isSending
      ) {
        return;
      }

      setContent('');

      try {
        await sendMessage(
          trimmedContent,
        );

        await markAsRead();
      } catch {
        setContent(
          trimmedContent,
        );
      }
    }, [
      content,
      isSending,
      sendMessage,
      markAsRead,
    ]);

  const sortedMessages =
    useMemo(
      () =>
        [...messages].sort(
          (first, second) =>
            new Date(
              first.createdAt,
            ).getTime() -
            new Date(
              second.createdAt,
            ).getTime(),
        ),
      [messages],
    );

  if (!conversationId) {
    return (
      <SafeAreaView
        style={styles.centerContainer}
      >
        <Text style={styles.errorText}>
          No se encontró la conversación.
        </Text>
      </SafeAreaView>
    );
  }

  if (
    isLoading &&
    !conversation
  ) {
    return (
      <SafeAreaView
        style={styles.centerContainer}
      >
        <ActivityIndicator
          size="large"
        />

        <Text style={styles.loadingText}>
          Cargando conversación...
        </Text>
      </SafeAreaView>
    );
  }

  const renderMessage = ({
    item,
  }: {
    item: ChatMessage;
  }) => {
    const isMine =
      item.senderId ===
      currentUser?.id;

    const isSystem =
      item.type === 'SYSTEM';

    if (isSystem) {
      return (
        <View
          style={styles.systemMessage}
        >
          <Text
            style={
              styles.systemMessageText
            }
          >
            {item.content}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          isMine
            ? styles.messageRowMine
            : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine
              ? styles.messageBubbleMine
              : styles.messageBubbleOther,
          ]}
        >
          {!isMine && (
            <Text
              style={styles.senderName}
            >
              {getSenderName(item)}
            </Text>
          )}

          <Text
            style={[
              styles.messageContent,
              isMine &&
                styles.messageContentMine,
            ]}
          >
            {item.content}
          </Text>

          <Text
            style={[
              styles.messageTime,
              isMine &&
                styles.messageTimeMine,
            ]}
          >
            {formatMessageTime(
              item.createdAt,
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 90
            : 0
        }
      >
        <View style={styles.header}>
          <View>
            <Text
              style={styles.headerTitle}
            >
              {conversation?.case.title ??
                'Conversación'}
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {conversation?.case.folio ??
                ''}
            </Text>
          </View>

          <View
            style={styles.connectionRow}
          >
            <View
              style={[
                styles.connectionDot,
                isConnected
                  ? styles.connectionDotOnline
                  : styles.connectionDotOffline,
              ]}
            />

            <Text
              style={
                styles.connectionText
              }
            >
              {isConnected
                ? 'En línea'
                : 'Reconectando'}
            </Text>
          </View>
        </View>

        {error && (
          <Pressable
            style={styles.errorBanner}
            onPress={clearError}
          >
            <Text
              style={
                styles.errorBannerText
              }
            >
              {error}
            </Text>

            <Text
              style={
                styles.errorBannerAction
              }
            >
              Toca para cerrar
            </Text>
          </Pressable>
        )}

        <FlatList
          ref={listRef}
          data={sortedMessages}
          keyExtractor={(item) =>
            item.id
          }
          renderItem={renderMessage}
          contentContainerStyle={
            styles.messagesContent
          }
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View
              style={
                styles.emptyContainer
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                Aún no hay mensajes
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }
              >
                Escribe el primer mensaje de esta conversación.
              </Text>
            </View>
          }
          ListHeaderComponent={
            hasMore ? (
              <Pressable
                style={
                  styles.loadMoreButton
                }
                disabled={isLoadingMore}
                onPress={() => {
                  void loadMoreMessages();
                }}
              >
                {isLoadingMore ? (
                  <ActivityIndicator
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.loadMoreText
                    }
                  >
                    Cargar mensajes anteriores
                  </Text>
                )}
              </Pressable>
            ) : null
          }
        />

        <View style={styles.composer}>
          <TextInput
            value={content}
            onChangeText={setContent}
            style={styles.input}
            placeholder="Escribe un mensaje..."
            multiline
            maxLength={4000}
            editable={
              conversation?.status ===
                'ACTIVE' &&
              !isSending
            }
            onFocus={() => {
              void markAsRead();
            }}
          />

          <Pressable
            style={[
              styles.sendButton,
              (!content.trim() ||
                isSending ||
                conversation?.status !==
                  'ACTIVE') &&
                styles.sendButtonDisabled,
            ]}
            disabled={
              !content.trim() ||
              isSending ||
              conversation?.status !==
                'ACTIVE'
            }
            onPress={() => {
              void handleSend();
            }}
          >
            {isSending ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.sendButtonText
                }
              >
                Enviar
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F7FAFC',
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      color: '#4A5568',
    },
    errorText: {
      color: '#C53030',
      textAlign: 'center',
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      color: '#1A202C',
      fontSize: 17,
      fontWeight: '700',
    },
    headerSubtitle: {
      marginTop: 2,
      color: '#718096',
      fontSize: 13,
    },
    connectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    connectionDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    connectionDotOnline: {
      backgroundColor: '#38A169',
    },
    connectionDotOffline: {
      backgroundColor: '#DD6B20',
    },
    connectionText: {
      color: '#4A5568',
      fontSize: 12,
    },
    errorBanner: {
      margin: 12,
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#FED7D7',
    },
    errorBannerText: {
      color: '#9B2C2C',
      fontWeight: '600',
    },
    errorBannerAction: {
      marginTop: 4,
      color: '#C53030',
      fontSize: 12,
    },
    messagesContent: {
      flexGrow: 1,
      paddingHorizontal: 12,
      paddingVertical: 16,
    },
    messageRow: {
      marginBottom: 10,
      flexDirection: 'row',
    },
    messageRowMine: {
      justifyContent: 'flex-end',
    },
    messageRowOther: {
      justifyContent: 'flex-start',
    },
    messageBubble: {
      maxWidth: '82%',
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 14,
    },
    messageBubbleMine: {
      backgroundColor: '#1A365D',
      borderBottomRightRadius: 4,
    },
    messageBubbleOther: {
      backgroundColor: '#FFFFFF',
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    senderName: {
      marginBottom: 4,
      color: '#2B6CB0',
      fontSize: 12,
      fontWeight: '700',
    },
    messageContent: {
      color: '#1A202C',
      fontSize: 15,
      lineHeight: 20,
    },
    messageContentMine: {
      color: '#FFFFFF',
    },
    messageTime: {
      marginTop: 5,
      color: '#718096',
      fontSize: 10,
      textAlign: 'right',
    },
    messageTimeMine: {
      color: '#CBD5E0',
    },
    systemMessage: {
      alignSelf: 'center',
      marginVertical: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: '#EDF2F7',
    },
    systemMessageText: {
      color: '#4A5568',
      fontSize: 12,
      textAlign: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      color: '#2D3748',
      fontSize: 17,
      fontWeight: '700',
    },
    emptyDescription: {
      marginTop: 6,
      color: '#718096',
      textAlign: 'center',
    },
    loadMoreButton: {
      alignSelf: 'center',
      marginBottom: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    loadMoreText: {
      color: '#2B6CB0',
      fontWeight: '600',
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
    },
    input: {
      flex: 1,
      minHeight: 42,
      maxHeight: 120,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: '#CBD5E0',
      borderRadius: 12,
      backgroundColor: '#F7FAFC',
      color: '#1A202C',
    },
    sendButton: {
      minWidth: 72,
      height: 42,
      marginLeft: 8,
      paddingHorizontal: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1A365D',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });