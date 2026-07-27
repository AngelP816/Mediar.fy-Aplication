import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  useState,
} from 'react';

import {
  useAuthStore,
} from '../stores/auth.store';

import {
  useChatStore,
} from '../stores/chat.store';

interface OpenCaseChatButtonProps {
  caseId: string;
}

export function OpenCaseChatButton({
  caseId,
}: OpenCaseChatButtonProps) {
  const [isOpening, setIsOpening] =
    useState(false);

  const user =
    useAuthStore(
      (state) => state.user,
    );

  const openCaseChat =
    useChatStore(
      (state) => state.openCaseChat,
    );

  const handleOpen =
    async () => {
      if (
        !user ||
        isOpening
      ) {
        return;
      }

      setIsOpening(true);

      try {
        const conversation =
          await openCaseChat(caseId);

        if (
          user.role === 'MEDIATOR'
        ) {
          router.push({
            pathname:
              '/(mediator)/cases/chat/[conversationId]',
            params: {
              conversationId:
                conversation.id,
            },
          });

          return;
        }

        if (
          user.role === 'CLIENT'
        ) {
          router.push({
            pathname:
              '/(client)/cases/chat/[conversationId]',
            params: {
              conversationId:
                conversation.id,
            },
          });
        }
      } catch (error) {
        console.log(
          'No fue posible abrir la conversación:',
          error,
        );
      } finally {
        setIsOpening(false);
      }
    };

  return (
    <Pressable
      style={[
        styles.button,
        isOpening &&
          styles.buttonDisabled,
      ]}
      disabled={isOpening}
      onPress={() => {
        void handleOpen();
      }}
    >
      {isOpening ? (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
        />
      ) : (
        <Text
          style={styles.buttonText}
        >
          Abrir conversación
        </Text>
      )}
    </Pressable>
  );
}

const styles =
  StyleSheet.create({
    button: {
      minHeight: 46,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: '#1A365D',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });