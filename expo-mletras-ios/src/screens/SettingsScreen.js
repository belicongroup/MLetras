import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SettingsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.text}>Configure your MLetras experience here. (Coming soon)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#4B5563',
  },
});

export default SettingsScreen;

