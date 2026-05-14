import { pool } from '../config/db.js';

/**
 * Runs AFTER authRequired. Looks up (or auto-creates) the local
 * `users` row that corresponds to the Keycloak `sub` claim, and
 * attaches the internal BIGINT id at req.user.id.
 *
 * This is the bridge between the external identity provider and
 * the application's own user records.
 */
export async function resolveUser(req, res, next) {
  try {
    const externalId = req.user?.sub;
    if (!externalId) {
      return res.status(401).json({ error: 'Token missing sub claim' });
    }

    const conn = await pool.getConnection();
    try {
      const existing = await conn.query(
        'SELECT user_id FROM users WHERE external_id = ?',
        [externalId]
      );

      if (existing.length > 0) {
        req.user.id = Number(existing[0].user_id);
      } else {
        const name  = req.user.name || req.user.username || 'Anonymous';
        const email = req.user.email || `${externalId}@external.local`;
        const result = await conn.query(
          `INSERT INTO users (name, email, external_id) VALUES (?, ?, ?)`,
          [name, email, externalId]
        );
        req.user.id = Number(result.insertId);
        console.log(`[users] auto-provisioned user_id=${req.user.id} for sub=${externalId}`);
      }
      next();
    } finally {
      conn.release();
    }
  } catch (err) {
    next(err);
  }
}
