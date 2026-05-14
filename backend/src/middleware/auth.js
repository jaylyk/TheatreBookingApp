import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../config/env.js';

const JWKS = createRemoteJWKSet(new URL(env.oidc.jwksUri));

/**
 * Verifies the Bearer JWT against the Keycloak realm's public keys.
 * On success: attaches the decoded payload to req.user.
 * On failure: returns 401.
 *
 * Accepts tokens whose `iss` matches any of the configured issuers.
 * This is needed when the same Keycloak realm is reachable under
 * multiple hostnames (host vs. emulator).
 */
export async function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = header.slice('Bearer '.length).trim();

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer:   env.oidc.issuers,   // jose accepts an array of valid issuers
      audience: env.oidc.audience,
    });
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
