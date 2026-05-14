import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Divider, Chip } from 'react-native-paper';
import { api } from '../api/client.js';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ShowtimesScreen({ route, navigation }) {
  const { show, theatre } = route.params;
  const [showtimes, setShowtimes] = useState(null);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/shows/${show.show_id}/showtimes`);
        setShowtimes(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [show.show_id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.showTitle}>{show.title}</Text>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>📍 {theatre.name}</Text>
          {show.description ? (
            <Text variant="bodyMedium" style={styles.desc}>{show.description}</Text>
          ) : null}
          <Divider style={styles.divider} />
          <Text variant="labelMedium" style={{ opacity: 0.7 }}>
            Διάρκεια: {show.duration_min} λεπτά  ·  Ηλικία: {show.age_rating || '—'}
          </Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Διαθέσιμες Ημερομηνίες</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {!showtimes && !error && <ActivityIndicator style={{ marginTop: 24 }} />}
      {showtimes?.length === 0 && (
        <Text style={styles.empty}>Δεν υπάρχουν προγραμματισμένες παραστάσεις.</Text>
      )}

      {showtimes?.map(st => {
        const isPast = new Date(st.start_datetime) < new Date();
        return (
          <Card
            key={st.showtime_id}
            style={[styles.card, isPast && styles.cardDisabled]}
            onPress={isPast ? undefined : () => navigation.navigate('SeatSelection', { showtime: st, show, theatre })}
          >
            <Card.Content>
              <Text variant="titleSmall" style={isPast ? styles.past : styles.date}>
                🗓  {formatDate(st.start_datetime)}
              </Text>
              <Text variant="bodyMedium" style={styles.hall}>🏛  {st.hall}</Text>
              <Chip icon="tag-outline" compact style={styles.priceChip}>
                Από {Number(st.base_price).toFixed(2)} €
              </Chip>
              {isPast && (
                <Text style={styles.pastLabel}>Η παράσταση έχει ολοκληρωθεί</Text>
              )}
            </Card.Content>
            {!isPast && (
              <Card.Actions>
                <Text
                  variant="labelLarge"
                  style={styles.selectAction}
                  onPress={() => navigation.navigate('SeatSelection', { showtime: st, show, theatre })}
                >
                  Επιλογή θέσεων →
                </Text>
              </Card.Actions>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 16, paddingBottom: 32 },
  infoCard:     { marginBottom: 20, backgroundColor: '#f3edf7' },
  showTitle:    { fontWeight: '700', marginBottom: 4 },
  desc:         { marginTop: 8, opacity: 0.75 },
  divider:      { marginVertical: 10 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  card:         { marginBottom: 12 },
  cardDisabled: { opacity: 0.5 },
  date:         { fontWeight: '600', marginBottom: 4, color: '#1a1a1a' },
  past:         { fontWeight: '600', marginBottom: 4, color: '#9e9e9e' },
  hall:         { opacity: 0.7, marginBottom: 8 },
  priceChip:    { alignSelf: 'flex-start' },
  pastLabel:    { marginTop: 6, color: '#9e9e9e', fontStyle: 'italic', fontSize: 12 },
  selectAction: { color: '#6750A4' },
  error:        { color: '#b00020', marginVertical: 16 },
  empty:        { textAlign: 'center', marginTop: 32, opacity: 0.5 },
});
