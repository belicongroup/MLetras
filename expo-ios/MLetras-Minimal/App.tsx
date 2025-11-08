import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>M</Text>
        <Text style={styles.title}>MLetras</Text>
        <Text style={styles.subtitle}>Lyrics and Music Notes App</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.status}>Ready for App Store</Text>
        <Text style={styles.description}>
          Welcome to MLetras! Your personal lyrics and music notes companion.
        </Text>
      </View>
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 40,
  },
  version: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  status: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: '600',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
});
