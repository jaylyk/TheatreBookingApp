// All environment-specific URLs live here.
// Android emulator can't reach "localhost" of the host machine
// directly — the host is exposed at the special IP 10.0.2.2.
// iOS simulator (or device) can use localhost directly.
import { Platform } from 'react-native';

const HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const config = {
  api: {
    baseUrl: `http://${HOST}:3000`,
  },
  keycloak: {
    issuer:   `http://${HOST}:8080/realms/theatre-booking`,
    clientId: 'mobile-app',
    // The Expo dev runtime accepts this scheme automatically.
    // For a built APK you'd switch this to 'myapp://auth/callback'
    // and register it in Keycloak as a Valid Redirect URI.
    redirectScheme: 'mobile',
  },
};
