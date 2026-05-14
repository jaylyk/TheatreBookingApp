import 'dotenv/config';

const required = [
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'OIDC_ISSUER', 'OIDC_JWKS_URI'
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

// OIDC_ISSUER may be a comma-separated list to accept tokens issued
// under multiple hostnames (e.g. localhost for direct host access,
// 10.0.2.2 for Android emulator). All listed issuers must point to
// the same Keycloak realm — the JWKS public keys are shared.
const issuers = process.env.OIDC_ISSUER.split(',').map(s => s.trim()).filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 3000),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },
  oidc: {
    issuers,
    jwksUri:  process.env.OIDC_JWKS_URI,
    clientId: process.env.OIDC_CLIENT_ID || 'mobile-app',
  },
};
