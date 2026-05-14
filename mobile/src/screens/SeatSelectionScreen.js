import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Text, Button, ActivityIndicator, Surface, Chip } from 'react-native-paper';
import { api } from '../api/client.js';

const PREMIUM_MULTIPLIER = 1.5;

function seatPrice(seat, basePrice) {
  return seat.category === 'premium' ? basePrice * PREMIUM_MULTIPLIER : basePrice;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('el-GR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function SeatButton({ seat, selected, onPress }) {
  let bg = '#4caf50';       // available standard = green
  let color = '#fff';

  if (seat.status === 'reserved') {
    bg = '#bdbdbd';         // reserved = grey
  } else if (selected) {
    bg = '#6750A4';         // selected = purple (brand colour)
  } else if (seat.category === 'premium') {
    bg = '#ffa000';         // available premium = amber
  }

  const disabled = seat.status === 'reserved';

  return (
    <TouchableOpacity
      style={[styles.seat, { backgroundColor: bg }, disabled && styles.seatDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Text style={[styles.seatText, { color }]}>
        {seat.row_label}{seat.seat_number}
      </Text>
    </TouchableOpacity>
  );
}

export default function SeatSelectionScreen({ route, navigation }) {
  const { showtime, show, theatre, reservationId, currentSeatLabels } = route.params;
  const isModifyMode = !!reservationId;
  const basePrice = Number(showtime.base_price);

  const [seats,     setSeats]     = useState(null);
  const [selected,  setSelected]  = useState(new Set()); // Set of seat_id
  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(`/showtimes/${showtime.showtime_id}/seats`);
        setSeats(data);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [showtime.showtime_id]);

  // Pre-select existing seats when in modify mode
  useEffect(() => {
    if (!seats || !isModifyMode || !currentSeatLabels?.length) return;
    const labelSet = new Set(currentSeatLabels);
    const preSelected = new Set(
      seats
        .filter(s => labelSet.has(`${s.row_label}${s.seat_number}`))
        .map(s => s.seat_id)
    );
    setSelected(preSelected);
  }, [seats, isModifyMode, currentSeatLabels]);

  const toggle = useCallback((seatId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  }, []);

  // Group seats by row, sorted
  const rows = {};
  if (seats) {
    seats.forEach(s => {
      if (!rows[s.row_label]) rows[s.row_label] = [];
      rows[s.row_label].push(s);
    });
    Object.keys(rows).forEach(r => {
      rows[r].sort((a, b) => a.seat_number - b.seat_number);
    });
  }
  const rowLabels = Object.keys(rows).sort();

  const selectedSeats = seats?.filter(s => selected.has(s.seat_id)) ?? [];
  const totalPrice = selectedSeats.reduce((sum, s) => sum + seatPrice(s, basePrice), 0);

  function goToConfirm() {
    if (selectedSeats.length === 0) return;
    navigation.navigate('Confirm', { showtime, show, theatre, selectedSeats, totalPrice });
  }

  async function handleSaveModify() {
    if (selectedSeats.length === 0) return;
    setSaving(true);
    try {
      await api.patch(`/reservations/${reservationId}`, {
        seat_ids: selectedSeats.map(s => s.seat_id),
      });
      navigation.navigate('MyReservations');
    } catch (err) {
      const msg = err.status === 409
        ? 'Μία ή περισσότερες θέσεις δεν είναι πλέον διαθέσιμες. Επιλέξτε διαφορετικές.'
        : err.message || 'Κάτι πήγε στραβά.';
      Alert.alert('Αποτυχία αλλαγής', msg, [{ text: 'OK' }]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Show info */}
        <Surface style={styles.infoBox} elevation={1}>
          <Text variant="titleSmall" style={styles.bold}>{show.title}</Text>
          <Text variant="bodySmall" style={{ opacity: 0.65 }}>
            🗓 {formatDate(showtime.start_datetime)}  ·  🏛 {showtime.hall}
          </Text>
          <Text variant="bodySmall" style={{ opacity: 0.65 }}>📍 {theatre.name}</Text>
        </Surface>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#4caf50' }]} />
            <Text variant="labelSmall">Standard ({basePrice.toFixed(0)}€)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#ffa000' }]} />
            <Text variant="labelSmall">Premium ({(basePrice * PREMIUM_MULTIPLIER).toFixed(0)}€)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#6750A4' }]} />
            <Text variant="labelSmall">Επιλεγμένο</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#bdbdbd' }]} />
            <Text variant="labelSmall">Κρατημένο</Text>
          </View>
        </View>

        {/* Stage indicator */}
        <View style={styles.stage}>
          <Text style={styles.stageText}>— ΣΚΗΝΗ —</Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
        {!seats && !error && <ActivityIndicator style={{ marginTop: 24 }} />}

        {/* Seat grid */}
        {rowLabels.map(rowLabel => (
          <View key={rowLabel} style={styles.row}>
            <Text style={styles.rowLabel}>{rowLabel}</Text>
            <View style={styles.rowSeats}>
              {rows[rowLabel].map(seat => (
                <SeatButton
                  key={seat.seat_id}
                  seat={seat}
                  selected={selected.has(seat.seat_id)}
                  onPress={() => toggle(seat.seat_id)}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky bottom bar */}
      <Surface style={styles.bottomBar} elevation={4}>
        <View style={styles.bottomInfo}>
          <Text variant="labelMedium">
            {selected.size} θέση/εις επιλεγμένη/ες
          </Text>
          <Text variant="titleMedium" style={styles.totalPrice}>
            Σύνολο: {totalPrice.toFixed(2)} €
          </Text>
        </View>
        <Button
          mode="contained"
          disabled={selected.size === 0 || saving}
          loading={saving}
          onPress={isModifyMode ? handleSaveModify : goToConfirm}
          style={styles.confirmBtn}
          icon={isModifyMode ? 'content-save-outline' : 'chevron-right'}
          contentStyle={isModifyMode ? undefined : { flexDirection: 'row-reverse' }}
        >
          {isModifyMode ? 'Αποθήκευση' : 'Συνέχεια'}
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { padding: 16, paddingBottom: 16 },
  infoBox:     { padding: 12, borderRadius: 10, marginBottom: 12 },
  bold:        { fontWeight: '700', marginBottom: 2 },
  legend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot:         { width: 12, height: 12, borderRadius: 6 },
  stage:       {
    alignItems: 'center', marginBottom: 16, paddingVertical: 6,
    backgroundColor: '#e0e0e0', borderRadius: 6,
  },
  stageText:   { fontWeight: '600', color: '#555', letterSpacing: 2 },
  row:         { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowLabel:    { width: 20, fontWeight: '700', color: '#555', textAlign: 'center' },
  rowSeats:    { flexDirection: 'row', flexWrap: 'wrap', flex: 1, gap: 4, marginLeft: 8 },
  seat:        { width: 30, height: 30, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  seatDisabled:{ opacity: 0.6 },
  seatText:    { fontSize: 9, fontWeight: '600' },
  bottomBar:   {
    padding: 16, flexDirection: 'row', alignItems: 'center',
    gap: 12, backgroundColor: '#fff',
  },
  bottomInfo:  { flex: 1 },
  totalPrice:  { fontWeight: '700', color: '#6750A4' },
  confirmBtn:  { minWidth: 120 },
  error:       { color: '#b00020', marginVertical: 16 },
});
