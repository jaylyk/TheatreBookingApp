import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import { api } from '../api/client.js';

export default function ShowsScreen({ route, navigation }) {
  const { theatre } = route.params;
  const [shows,  setShows]  = useState(null);
  const [error,  setError]  = useState(null);
  const [query,  setQuery]  = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/shows?theatreId=${theatre.theatre_id}`);
        setShows(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [theatre.theatre_id]);

  const filtered = shows?.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.subtitle}>
        <Text variant="bodyMedium" style={styles.location}>📍 {theatre.location}</Text>
        <Text variant="bodySmall" style={{ opacity: 0.6 }}>{theatre.description}</Text>
      </View>

      <Searchbar
        placeholder="Αναζήτηση παράστασης…"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {!shows && !error && <ActivityIndicator style={{ marginTop: 24 }} />}
      {shows && filtered?.length === 0 && (
        <Text style={styles.empty}>Δεν βρέθηκαν παραστάσεις.</Text>
      )}

      {filtered?.map(show => (
        <Card
          key={show.show_id}
          style={styles.card}
          onPress={() => navigation.navigate('Showtimes', { show, theatre })}
        >
          <Card.Title
            title={show.title}
            subtitle={`${show.duration_min} λεπτά`}
            titleStyle={styles.cardTitle}
          />
          <Card.Content>
            {show.description ? (
              <Text variant="bodyMedium" style={styles.desc}>{show.description}</Text>
            ) : null}
            <View style={styles.chips}>
              <Chip icon="clock-outline" compact style={styles.chip}>
                {show.duration_min} λεπ.
              </Chip>
              {show.age_rating ? (
                <Chip icon="account-child-outline" compact style={styles.chip}>
                  {show.age_rating}
                </Chip>
              ) : null}
            </View>
          </Card.Content>
          <Card.Actions>
            <Text variant="labelLarge" onPress={() => navigation.navigate('Showtimes', { show, theatre })}>
              Προβολή ημερομηνιών →
            </Text>
          </Card.Actions>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  subtitle:  { marginBottom: 12 },
  location:  { fontWeight: '500', marginBottom: 4 },
  search:    { marginBottom: 16 },
  card:      { marginBottom: 12 },
  cardTitle: { fontWeight: '600' },
  desc:      { opacity: 0.75, marginBottom: 8 },
  chips:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:      { alignSelf: 'flex-start' },
  error:     { color: '#b00020', marginVertical: 16 },
  empty:     { textAlign: 'center', marginTop: 32, opacity: 0.5 },
});
