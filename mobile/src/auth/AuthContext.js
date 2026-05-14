import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  buildAuthRequest, exchangeCodeForTokens, refreshTokens,
  decodeJwt, discovery, getRedirectUri,
} from './authService.js';
import { saveTokens, loadTokens, clearTokens, saveUser, loadUser } from './tokenStorage.js';
import { config } from '../config.js';

// Required for Expo to dismiss the in-app browser after auth.
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [accessToken,  setAccessToken]  = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  // The expo-auth-session hook does most of the heavy lifting:
  // creates the PKCE code_verifier, builds the authorize URL,
  // launches the in-app browser, listens for the redirect.
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    buildAuthRequest(),
    discovery
  );

  // On startup, rehydrate from SecureStore so the user stays logged in.
  useEffect(() => {
    (async () => {
      try {
        const { accessToken: a, refreshToken: r } = await loadTokens();
        const u = await loadUser();
        if (a && r) {
          setAccessToken(a); setRefreshToken(r); setUser(u);
        }
      } finally {
        setBootstrapped(true);
      }
    })();
  }, []);

  // When the auth flow completes, exchange the code for tokens.
  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier) {
      (async () => {
        try {
          const tokens = await exchangeCodeForTokens(
            response.params.code,
            request.codeVerifier
          );
          const payload = decodeJwt(tokens.accessToken);
          const u = {
            sub:      payload?.sub,
            email:    payload?.email,
            name:     payload?.name,
            username: payload?.preferred_username,
          };
          await saveTokens({
            accessToken:  tokens.accessToken,
            refreshToken: tokens.refreshToken,
          });
          await saveUser(u);
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);
          setUser(u);
        } catch (err) {
          console.error('[auth] token exchange failed:', err);
        }
      })();
    }
  }, [response]);

  const signIn = useCallback(async () => {
    await promptAsync();
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await clearTokens();
    setAccessToken(null); setRefreshToken(null); setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!refreshToken) throw new Error('no_refresh_token');
    const tokens = await refreshTokens(refreshToken);
    await saveTokens({
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    return tokens.accessToken;
  }, [refreshToken]);

  return (
    <AuthContext.Provider value={{
      user, accessToken, bootstrapped,
      signIn, signOut, refresh,
      authRequestReady: !!request,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
