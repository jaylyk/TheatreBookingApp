import { config } from '../config.js';
import { loadTokens, saveTokens } from '../auth/tokenStorage.js';
import { refreshTokens } from '../auth/authService.js';

/**
 * Thin wrapper around fetch that:
 *  1. Reads the access_token from SecureStore for each request
 *  2. Sets Authorization + Content-Type headers
 *  3. On HTTP 401, tries to refresh the token once and retries
 */
async function request(path, { method = 'GET', body, retry = true } = {}) {
  const { accessToken, refreshToken } = await loadTokens();

  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const res = await fetch(`${config.api.baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Try to refresh once if unauthorized.
  if (res.status === 401 && retry && refreshToken) {
    try {
      const tokens = await refreshTokens(refreshToken);
      await saveTokens({
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      return request(path, { method, body, retry: false });
    } catch {
      // Refresh failed — caller will see the 401 surface up.
    }
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body   = data;
    throw err;
  }
  return data;
}

export const api = {
  get:    (path)        => request(path),
  post:   (path, body)  => request(path, { method: 'POST',   body }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body }),
  del:    (path)        => request(path, { method: 'DELETE' }),
};
