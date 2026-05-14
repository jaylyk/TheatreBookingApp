import { pool } from '../config/db.js';

export async function findAll({ location, q } = {}) {
  const where = [];
  const params = [];
  if (location) { where.push('location LIKE ?'); params.push(`%${location}%`); }
  if (q)        { where.push('name LIKE ?');     params.push(`%${q}%`); }
  const sql = `
    SELECT theatre_id, name, location, description
    FROM theatres
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY name ASC
  `;
  return pool.query(sql, params);
}

export async function findById(id) {
  const rows = await pool.query(
    `SELECT theatre_id, name, location, description
     FROM theatres WHERE theatre_id = ?`, [id]
  );
  return rows[0] || null;
}
