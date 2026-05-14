import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';

const JWKS = createRemoteJWKSet(new URL(env.oidc.jwksUri));

/**
 * Verifies the Bearer JWT against the Keycloak realm's public keys.
 * On success: attaches the decoded payload to req.user.
 *
 * For public clients, Keycloak access tokens don't include an `aud`
 * claim by default — they identify the authorized party via `azp`.
 * We verify that azp matches our expected client ID, which is the
 * recommended pattern for public-client setups.
 */
export async function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = header.slice('Bearer '.length).trim();

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.oidc.issuers,
    });
    if (payload.azp !== env.oidc.clientId) {
      throw new Error(`unexpected azp: ${payload.azp}`);
    }
    req.user = {
      sub:      payload.sub,
      email:    payload.email,
      username: payload.preferred_username,
      name:     payload.name,
      raw:      payload,
    };
    next();
  } catch (err) {
    console.warn('[auth] token verification failed:', err.code || err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
