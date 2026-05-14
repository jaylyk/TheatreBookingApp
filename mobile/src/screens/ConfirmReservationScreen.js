import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, Divider, Chip, ActivityIndicator } from 'react-native-paper';
import { api } from '../api/client.js';

const PREMIUM_MULTIPLIER = 1.5;

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('el-GR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ConfirmReservationScreen({ route, navigation }) {
  const { showtime, show, theatre, selectedSeats, totalPrice } = route.params;
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await api.post('/reservations', {
        showtime_id: showtime.showtime_id,
        seat_ids:    selectedSeats.map(s => s.seat_id),
      });
      // Replace stack so user can't go back to seat selection
      navigation.reset({
        index: 1,
        routes: [{ name: 'Home' }, { name: 'MyReservations' }],
      });
    } catch (err) {
      const msg =
        err.status === 409
          ? 'Μία ή περισσότερες θέσεις μόλις κρατήθηκαν από άλλον χρήστη. Επιλέξτε διαφορετικές θέσεις.'
          : err.message || 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.';
      Alert.alert('Αποτυχία κράτησης', msg, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  }

  const basePrice = Number(showtime.base_price);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.heading}>Σύνοψη Κράτησης</Text>

      {/* Show & showtime info */}
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleMedium" style={styles.bold}>{show.title}</Text>
        <Text variant="bodyMedium" style={styles.meta}>📍 {theatre.name} · {theatre.location}</Text>
        <Text variant="bodyMedium" style={styles.meta}>🗓 {formatDate(showtime.start_datetime)}</Text>
        <Text variant="bodyMedium" style={styles.meta}>🏛 {showtime.hall}</Text>
      </Surface>

      {/* Selected seats */}
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleSmall" style={[styles.bold, { marginBottom: 12 }]}>
          Επιλεγμένες Θέσεις ({selectedSeats.length})
        </Text>
        {selectedSeats.map(seat => {
          const price = seat.category === 'premium'
            ? basePrice * PREMIUM_MULTIPLIER
            : basePrice;
          return (
            <View key={seat.seat_id} style={styles.seatRow}>
              <View style={styles.seatLeft}>
                <Chip
                  compact
                  style={[
                    styles.seatChip,
                    seat.category === 'premium' ? styles.premiumChip : styles.standardChip,
                  ]}
                >
                  {seat.row_label}{seat.seat_number}
                </Chip>
                <Text variant="bodySmall" style={styles.category}>
                  {seat.category === 'premium' ? 'Premium' : 'Standard'}
                </Text>
              </View>
              <Text variant="bodyMedium" style={styles.seatPrice}>
                {price.toFixed(2)} €
              </Text>
            </View>
          );
        })}

        <Divider style={styles.divider} />

        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={styles.bold}>Σύνολο</Text>
          <Text variant="headlineSmall" style={styles.totalAmount}>
            {totalPrice.toFixed(2)} €
          </Text>
        </View>
      </Surface>

      {/* Note on concurrency */}
      <Text variant="bodySmall" style={styles.note}>
        ℹ️ Η κράτηση επιβεβαιώνεται ατομικά — σε ταυτόχρονη προσπάθεια κερδίζει ο πρώτος.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <Button
          mode="contained"
          icon="check-circle-outline"
          onPress={handleConfirm}
          style={styles.btn}
          contentStyle={styles.btnContent}
        >
          Επιβεβαίωση Κράτησης
        </Button>
      )}

      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        disabled={loading}
      >
        Πίσω – Αλλαγή Θέσεων
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 16, paddingBottom: 40 },
  heading:      { fontWeight: '700', marginBottom: 16 },
  card:         { padding: 16, borderRadius: 12, marginBottom: 16 },
  bold:         { fontWeight: '700' },
  meta:         { opacity: 0.7, marginTop: 4 },
  seatRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  seatLeft:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seatChip:     { height: 28 },
  premiumChip:  { backgroundColor: '#fff8e1' },
  standardChip: { backgroundColor: '#e8f5e9' },
  category:     { opacity: 0.6 },
  seatPrice:    { fontWeight: '600' },
  divider:      { marginVertical: 12 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount:  { fontWeight: '700', color: '#6750A4' },
  note:         { opacity: 0.55, marginBottom: 20, fontStyle: 'italic', textAlign: 'center' },
  btn:          { marginBottom: 12 },
  btnContent:   { paddingVertical: 6 },
  backBtn:      {},
});
