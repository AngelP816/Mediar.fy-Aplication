import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
} from 'expo-router';

export default function DocumentVersionsScreen() {
  const params = useLocalSearchParams<{
    documentId?: string;
    documentName?: string;
  }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {params.documentName ??
          'Versiones del documento'}
      </Text>

      <Text style={styles.text}>
        Documento: {params.documentId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F7FAFC',
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A365D',
  },

  text: {
    marginTop: 12,
    color: '#4A5568',
  },
});