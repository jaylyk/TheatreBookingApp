import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client.js';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('el-GR', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusChip({ status }) {
  const map = {
    active:    { label: 'Ενεργή',     bg: '#e8f5e9', color: '#2e7d32' },
    cancelled: { label: 'Ακυρωμένη', bg: '#ffebee', color: '#c62828' },
  };
  const s = map[status] || { label: status, bg: '#f5f5f5', color: '#555' };
  return (
    <Chip compact style={[styles.statusChip, { backgroundColor: s.bg }]}>
      <Text style={{ color: s.color, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
    </Chip>
  );
}

export default function MyReservationsScreen({ navigation }) {
  const [reservations, setReservations] = useState(null);
  const [error,        setError]        = useState(null);
  const [cancelling,   setCancelling]   = useState(null);
  const [modifying,    setModifying]    = useState(null); // reservation_id being opened for modify
  const [refreshing,   setRefreshing]   = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.get('/user/reservations');
      setReservations(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Reload every time screen comes into focus (e.g. after modify/cancel)
  useFocusEffect(
    useCallback(() => { load(); }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function confirmCancel(res) {
    Alert.alert(
      'Ακύρωση κράτησης',
      `Είστε σίγουρος/η ότι θέλετε να ακυρώσετε την κράτηση για "${res.show_title}";`,
      [
        { text: 'Όχι', style: 'cancel' },
        { text: 'Ναι, ακύρωση', style: 'destructive', onPress: () => doCancel(res.reservation_id) },
      ]
    );
  }

  async function doCancel(reservationId) {
    setCancelling(reservationId);
    try {
      await api.del(`/reservations/${reservationId}`);
      await load();
    } catch (e) {
      Alert.alert('Σφάλμα', e.message || 'Αποτυχία ακύρωσης.');
    } finally {
      setCancelling(null);
    }
  }

  async function openModify(res) {
    setModifying(res.reservation_id);
    try {
      // Fetch full showtime data (includes base_price)
      const showtime = await api.get(`/showtimes/${res.showtime_id}`);
      navigation.navigate('SeatSelection', {
        showtime,
        show:    { title: res.show_title, show_id: showtime.show_id },
        theatre: { name: res.theatre_name },
        reservationId:    res.reservation_id,
        currentSeatLabels: res.seat_labels, // e.g. ["C4", "A1"]
      });
    } catch (e) {
      Alert.alert('Σφάλμα', e.message || 'Αδυναμία φόρτωσης θέσεων.');
    } finally {
      setModifying(null);
    }
  }

  if (!reservations && !error) {
    return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {error && <Text style={styles.error}>{error}</Text>}

      {reservations?.length === 0 && (
        <View style={styles.empty}>
          <Text variant="headlineSmall" style={{ marginBottom: 8 }}>🎭</Text>
          <Text variant="titleMedium" style={{ marginBottom: 4 }}>Καμία κράτηση ακόμα</Text>
          <Text variant="bodyMedium" style={{ opacity: 0.6, textAlign: 'center' }}>
            Επιλέξτε θέατρο από την αρχική σελίδα για να κάνετε κράτηση.
          </Text>
        </View>
      )}

      {reservations?.map(res => {
        const isFuture  = new Date(res.start_datetime) > new Date();
        const isActive  = res.status === 'active';
        const canAct    = isActive && isFuture;
        const isBusy    = cancelling === res.reservation_id || modifying === res.reservation_id;

        return (
          <Card key={res.reservation_id} style={styles.card}>
            <Card.Content>
              <View style={styles.titleRow}>
                <Text variant="titleMedium" style={styles.showTitle} numberOfLines={1}>
                  {res.show_title}
                </Text>
                <StatusChip status={res.status} />
              </View>

              <Text variant="bodySmall" style={styles.meta}>📍 {res.theatre_name}</Text>
              <Text variant="bodySmall" style={styles.meta}>🗓 {formatDate(res.start_datetime)}</Text>
              <Text variant="bodySmall" style={styles.meta}>🏛 {res.hall}</Text>

              <Divider style={styles.divider} />

              <Text variant="bodySmall" style={styles.meta}>
                🪑 Θέσεις: {Array.isArray(res.seat_labels) ? res.seat_labels.join(', ') : res.seat_labels || '—'}
              </Text>
              <Text variant="titleSmall" style={styles.price}>
                💳 {Number(res.total_price).toFixed(2)} €
              </Text>
            </Card.Content>

            {canAct && (
              <Card.Actions style={styles.actions}>
                <Button
                  mode="outlined"
                  icon="seat-outline"
                  loading={modifying === res.reservation_id}
                  disabled={isBusy}
                  onPress={() => openModify(res)}
                  compact
                  style={styles.actionBtn}
                >
                  Αλλαγή Θέσεων
                </Button>
                <Button
                  mode="outlined"
                  textColor="#c62828"
                  icon="close-circle-outline"
                  loading={cancelling === res.reservation_id}
                  disabled={isBusy}
                  onPress={() => confirmCancel(res)}
                  compact
                  style={styles.actionBtn}
                >
                  Ακύρωση
                </Button>
              </Card.Actions>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { padding: 16, paddingBottom: 40 },
  card:       { marginBottom: 14 },
  titleRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  showTitle:  { fontWeight: '700', flex: 1, marginRight: 8 },
  statusChip: { alignSelf: 'flex-start' },
  meta:       { opacity: 0.7, marginBottom: 2 },
  divider:    { marginVertical: 8 },
  price:      { fontWeight: '700', color: '#6750A4', marginTop: 4 },
  actions:    { gap: 8 },
  actionBtn:  { flex: 1 },
  empty:      { flex: 1, alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
  error:      { color: '#b00020', marginBottom: 16 },
});
