import * as mariadb from 'mariadb';
import { env } from './env.js';

export const pool = mariadb.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  connectionLimit: env.db.connectionLimit,
  // Return numbers as JS numbers (not BigInt) since our IDs comfortably fit
  bigIntAsNumber: true,
  // Decimal columns as numbers
  decimalAsNumber: true,
});

// Sanity ping on startup
export async function pingDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    console.log('[db] connection OK');
  } finally {
    conn.release();
  }
}
