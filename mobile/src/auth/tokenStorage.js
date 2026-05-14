import * as SecureStore from 'expo-secure-store';

const KEYS = {
  access:  'kc_access_token',
  refresh: 'kc_refresh_token',
  user:    'kc_user_json',
};

export async function saveTokens({ accessToken, refreshToken }) {
  await SecureStore.setItemAsync(KEYS.access,  accessToken);
  await SecureStore.setItemAsync(KEYS.refresh, refreshToken);
}

export async function loadTokens() {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(KEYS.access),
    SecureStore.getItemAsync(KEYS.refresh),
  ]);
  return { accessToken, refreshToken };
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.access),
    SecureStore.deleteItemAsync(KEYS.refresh),
    SecureStore.deleteItemAsync(KEYS.user),
  ]);
}

export async function saveUser(user) {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
}

export async function loadUser() {
  const raw = await SecureStore.getItemAsync(KEYS.user);
  return raw ? JSON.parse(raw) : null;
}
