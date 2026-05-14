import { pool } from '../config/db.js';

export async function findAll({ theatreId, title } = {}) {
  const where = [];
  const params = [];
  if (theatreId) { where.push('s.theatre_id = ?'); params.push(theatreId); }
  if (title)     { where.push('s.title LIKE ?');   params.push(`%${title}%`); }
  const sql = `
    SELECT s.show_id, s.theatre_id, s.title, s.description,
           s.duration_min, s.age_rating, t.name AS theatre_name
    FROM shows s
    JOIN theatres t ON t.theatre_id = s.theatre_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY s.title ASC
  `;
  return pool.query(sql, params);
}

export async function findById(id) {
  const rows = await pool.query(`
    SELECT s.show_id, s.theatre_id, s.title, s.description,
           s.duration_min, s.age_rating, t.name AS theatre_name
    FROM shows s
    JOIN theatres t ON t.theatre_id = s.theatre_id
    WHERE s.show_id = ?
  `, [id]);
  return rows[0] || null;
}
