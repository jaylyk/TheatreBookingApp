import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './src/auth/AuthContext.js';
import LoginScreen            from './src/screens/LoginScreen.js';
import HomeScreen             from './src/screens/HomeScreen.js';
import ShowsScreen            from './src/screens/ShowsScreen.js';
import ShowtimesScreen        from './src/screens/ShowtimesScreen.js';
import SeatSelectionScreen    from './src/screens/SeatSelectionScreen.js';
import ConfirmReservationScreen from './src/screens/ConfirmReservationScreen.js';
import MyReservationsScreen   from './src/screens/MyReservationsScreen.js';

const Stack = createNativeStackNavigator();

const THEME_COLOR = '#6750A4';

function Root() {
  const { accessToken, bootstrapped } = useAuth();

  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={THEME_COLOR} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: THEME_COLOR },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      {accessToken ? (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Shows"
            component={ShowsScreen}
            options={({ route }) => ({ title: route.params?.theatre?.name || 'Παραστάσεις' })}
          />
          <Stack.Screen
            name="Showtimes"
            component={ShowtimesScreen}
            options={({ route }) => ({ title: route.params?.show?.title || 'Ημερομηνίες' })}
          />
          <Stack.Screen
            name="SeatSelection"
            component={SeatSelectionScreen}
            options={({ route }) => ({
              title: route.params?.reservationId ? 'Αλλαγή Θέσεων' : 'Επιλογή Θέσεων',
            })}
          />
          <Stack.Screen
            name="Confirm"
            component={ConfirmReservationScreen}
            options={{ title: 'Επιβεβαίωση Κράτησης' }}
          />
          <Stack.Screen
            name="MyReservations"
            component={MyReservationsScreen}
            options={{ title: 'Οι Κρατήσεις μου' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <PaperProvider theme={MD3LightTheme}>
      <AuthProvider>
        <NavigationContainer>
          <Root />
          <StatusBar style="auto" />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}
