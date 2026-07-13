import { StyleSheet, Text, View } from 'react-native';

export default function AdministratorHomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Panel del Admin
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
});