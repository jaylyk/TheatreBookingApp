import { pool } from '../config/db.js';

export async function findByShow(showId, { date } = {}) {
  const where = ['show_id = ?'];
  const params = [showId];
  if (date) {
    where.push('DATE(start_datetime) = ?');
    params.push(date);
  }
  return pool.query(`
    SELECT showtime_id, show_id, start_datetime, hall, base_price
    FROM showtimes
    WHERE ${where.join(' AND ')}
    ORDER BY start_datetime ASC
  `, params);
}

export async function findById(id) {
  const rows = await pool.query(`
    SELECT st.showtime_id, st.show_id, st.start_datetime,
           st.hall, st.base_price,
           s.title AS show_title, t.name AS theatre_name
    FROM showtimes st
    JOIN shows s    ON s.show_id    = st.show_id
    JOIN theatres t ON t.theatre_id = s.theatre_id
    WHERE st.showtime_id = ?
  `, [id]);
  return rows[0] || null;
}
