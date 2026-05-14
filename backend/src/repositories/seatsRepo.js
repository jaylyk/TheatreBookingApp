import { pool } from '../config/db.js';

export async function findByShowtime(showtimeId) {
  return pool.query(`
    SELECT seat_id, showtime_id, row_label, seat_number, category, status
    FROM seats
    WHERE showtime_id = ?
    ORDER BY row_label ASC, seat_number ASC
  `, [showtimeId]);
}
