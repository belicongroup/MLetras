import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MLetras</Text>
      <Text style={styles.subtitle}>Lyrics and Music Notes App</Text>
      <Text style={styles.version}>Version 1.0.0</Text>
      <Text style={styles.status}>Ready for App Store</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  version: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '600',
  },
});