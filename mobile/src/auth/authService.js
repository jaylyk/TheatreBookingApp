import * as AuthSession from 'expo-auth-session';
import { config } from '../config.js';

/**
 * The OIDC "discovery document" tells the library where the
 * authorization, token, and userinfo endpoints live for this realm.
 * Keycloak follows the standard layout, so we can spell them out
 * here without fetching /.well-known/openid-configuration.
 */
const discovery = {
  authorizationEndpoint: `${config.keycloak.issuer}/protocol/openid-connect/auth`,
  tokenEndpoint:         `${config.keycloak.issuer}/protocol/openid-connect/token`,
  endSessionEndpoint:    `${config.keycloak.issuer}/protocol/openid-connect/logout`,
};

/**
 * Decodes the payload (middle segment) of a JWT without verifying
 * the signature. We only use this to read 'sub', 'email' etc. for UI
 * — the backend still does the cryptographic verification.
 */
export function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

/**
 * Builds the redirect URI in the format Expo expects.
 * In dev this resolves to something like exp://10.0.2.2:8081
 * which we whitelisted in Keycloak earlier.
 */
export function getRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: config.keycloak.redirectScheme,
  });
}

/**
 * Returns the AuthRequest config that the `useAuthRequest` hook
 * needs. PKCE is enabled by default in expo-auth-session — the
 * library generates the code_verifier and code_challenge for us.
 */
export function buildAuthRequest() {
  return {
    clientId:     config.keycloak.clientId,
    redirectUri:  getRedirectUri(),
    scopes:       ['openid', 'profile', 'email'],
    usePKCE:      true,
    responseType: AuthSession.ResponseType.Code,
    prompt:       'login',   // always show login form — no SSO skip
  };
}

/**
 * Exchanges the authorization code (returned via deep link)
 * for an access + refresh token pair.
 */
export async function exchangeCodeForTokens(code, codeVerifier) {
  const result = await AuthSession.exchangeCodeAsync(
    {
      clientId:     config.keycloak.clientId,
      code,
      redirectUri:  getRedirectUri(),
      extraParams:  { code_verifier: codeVerifier },
    },
    discovery
  );
  return result; // { accessToken, refreshToken, expiresIn, idToken, ... }
}

/**
 * Uses a refresh_token to get a fresh access_token, transparently.
 */
export async function refreshTokens(refreshToken) {
  const result = await AuthSession.refreshAsync(
    {
      clientId:     config.keycloak.clientId,
      refreshToken,
    },
    discovery
  );
  return result;
}

export { discovery };
