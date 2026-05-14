import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, Surface, ActivityIndicator, Searchbar } from 'react-native-paper';
import { useAuth } from '../auth/AuthContext.js';
import { api } from '../api/client.js';

export default function HomeScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const [theatres, setTheatres] = useState(null);
  const [error,    setError]    = useState(null);
  const [query,    setQuery]    = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get('/theatres');
        setTheatres(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const filtered = theatres?.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium">Καλώς ήρθες,</Text>
            <Text variant="headlineSmall">{user?.name || user?.username}</Text>
            <Text variant="bodySmall" style={{ opacity: 0.6 }}>{user?.email}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Button
            mode="contained-tonal"
            icon="ticket-outline"
            onPress={() => navigation.navigate('MyReservations')}
            style={styles.actionBtn}
            compact
          >
            Κρατήσεις μου
          </Button>
          <Button
            mode="outlined"
            icon="logout"
            onPress={signOut}
            style={styles.actionBtn}
            compact
          >
            Αποσύνδεση
          </Button>
        </View>
      </Surface>

      <Text variant="titleLarge" style={styles.sectionTitle}>Θέατρα</Text>

      <Searchbar
        placeholder="Αναζήτηση θεάτρου ή πόλης…"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {!theatres && !error && <ActivityIndicator style={{ marginTop: 24 }} />}

      {filtered?.map(t => (
        <Card
          key={t.theatre_id}
          style={styles.card}
          onPress={() => navigation.navigate('Shows', { theatre: t })}
        >
          <Card.Title
            title={t.name}
            subtitle={t.location}
            titleStyle={styles.cardTitle}
            left={props => (
              <Text {...props} style={styles.cardIcon}>🎭</Text>
            )}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={{ opacity: 0.8 }}>{t.description}</Text>
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => navigation.navigate('Shows', { theatre: t })}>
              Δείτε παραστάσεις
            </Button>
          </Card.Actions>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 16, paddingBottom: 32 },
  header:       { padding: 16, borderRadius: 12, marginBottom: 16 },
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  headerActions:{ flexDirection: 'row', marginTop: 12, gap: 8 },
  actionBtn:    { flex: 1 },
  sectionTitle: { marginTop: 8, marginBottom: 8, fontWeight: '600' },
  search:       { marginBottom: 16 },
  card:         { marginBottom: 12 },
  cardTitle:    { fontWeight: '600' },
  cardIcon:     { fontSize: 24 },
  error:        { color: '#b00020', marginVertical: 16 },
});
