import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Surface } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext.js';

export default function LoginScreen() {
  const { signIn, authRequestReady } = useAuth();

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          Theatre Booking
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Συνδεθείτε για να δείτε παραστάσεις και να κάνετε κρατήσεις.
        </Text>
        <Button
          mode="contained"
          icon="login"
          disabled={!authRequestReady}
          onPress={signIn}
          style={styles.button}
        >
          Σύνδεση με Keycloak
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', padding: 24,
    backgroundColor: '#f5f5f5',
  },
  card: { padding: 24, borderRadius: 12, alignItems: 'center' },
  title:    { marginBottom: 8, fontWeight: '600' },
  subtitle: { textAlign: 'center', marginBottom: 24, opacity: 0.7 },
  button:   { width: '100%', paddingVertical: 6 },
});
