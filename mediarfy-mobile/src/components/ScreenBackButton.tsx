import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import {
  router,
  type Href,
} from 'expo-router';

interface ScreenBackButtonProps {
  fallbackRoute: Href;
}

export function ScreenBackButton({
  fallbackRoute,
}: ScreenBackButtonProps) {
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackRoute);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.button}
      hitSlop={12}
    >
      <Text style={styles.text}>
        ‹ Atrás
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});