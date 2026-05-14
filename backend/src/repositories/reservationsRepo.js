import { pool } from '../config/db.js';
import { httpError } from '../utils/httpError.js';

const PREMIUM_MULTIPLIER = 1.5;

/**
 * Price for a single seat: premium seats cost 1.5x the showtime's base price.
 */
function priceFor(seat, basePrice) {
  return seat.category === 'premium' ? basePrice * PREMIUM_MULTIPLIER : basePrice;
}

/**
 * Builds a "?,?,?,..." placeholder string for an IN clause.
 */
function placeholders(n) {
  return Array(n).fill('?').join(',');
}

/**
 * Verifies that a showtime exists, has not already started, and
 * returns its base_price. Used by create + modify.
 */
async function loadFutureShowtime(conn, showtimeId) {
  const rows = await conn.query(
    `SELECT showtime_id, start_datetime, base_price
     FROM showtimes WHERE showtime_id = ?`,
    [showtimeId]
  );
  if (rows.length === 0) throw httpError(404, 'Showtime not found');
  if (new Date(rows[0].start_datetime) < new Date()) {
    throw httpError(400, 'Cannot reserve seats for a past showtime');
  }
  return rows[0];
}

// =============================================================
// CREATE
// =============================================================
/**
 * Atomically reserves seats for a user.
 *
 * Concurrency protection:
 *  - `SELECT ... FOR UPDATE` takes row-level locks on the chosen
 *    seats, blocking any other transaction that tries to read
 *    them with FOR UPDATE until this transaction COMMITs or
 *    ROLLBACKs.
 *  - If two clients try to reserve the same seat at the same time,
 *    one will win the lock; the other will block, then see the
 *    seat as 'reserved' and get a 409 Conflict.
 */
export async function createReservation(userId, showtimeId, seatIds) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw httpError(400, 'seat_ids must be a non-empty array');
  }
  if (new Set(seatIds).size !== seatIds.length) {
    throw httpError(400, 'seat_ids must be unique');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log(`[tx] BEGIN  create  user=${userId} showtime=${showtimeId} seats=[${seatIds}]`);

    // 1. Validate showtime
    const showtime = await loadFutureShowtime(conn, showtimeId);
    const basePrice = Number(showtime.base_price);

    // 2. Lock requested seats
    const seats = await conn.query(
      `SELECT seat_id, showtime_id, status, category
       FROM seats
       WHERE seat_id IN (${placeholders(seatIds.length)})
       FOR UPDATE`,
      seatIds
    );

    if (seats.length !== seatIds.length) {
      throw httpError(400, 'One or more seat IDs do not exist');
    }

    // 3. Validate every seat belongs to this showtime AND is available
    for (const s of seats) {
      if (Number(s.showtime_id) !== Number(showtimeId)) {
        throw httpError(400, `Seat ${s.seat_id} does not belong to showtime ${showtimeId}`);
      }
      if (s.status !== 'available') {
        throw httpError(409, `Seat ${s.seat_id} is no longer available`);
      }
    }

    // 4. Compute total price
    const total = seats.reduce((sum, s) => sum + priceFor(s, basePrice), 0);

    // 5. Insert reservation row
    const result = await conn.query(
      `INSERT INTO reservations (user_id, showtime_id, total_price)
       VALUES (?, ?, ?)`,
      [userId, showtimeId, total]
    );
    const reservationId = Number(result.insertId);

    // 6. Link seats <-> reservation
    await conn.batch(
      'INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (?, ?)',
      seats.map(s => [reservationId, s.seat_id])
    );

    // 7. Mark seats as reserved
    await conn.query(
      `UPDATE seats SET status = 'reserved'
       WHERE seat_id IN (${placeholders(seatIds.length)})`,
      seatIds
    );

    await conn.commit();
    console.log(`[tx] COMMIT create  reservation=${reservationId}`);

    return { reservation_id: reservationId, total_price: total, seat_ids: seatIds };
  } catch (err) {
    await conn.rollback();
    console.log(`[tx] ROLLBACK create  reason="${err.message}"`);
    throw err;
  } finally {
    conn.release();
  }
}

// =============================================================
// LIST FOR USER
// =============================================================
export async function findByUser(userId) {
  const rows = await pool.query(`
    SELECT
      r.reservation_id, r.showtime_id, r.total_price, r.status, r.created_at,
      st.start_datetime, st.hall,
      sh.title AS show_title, t.name AS theatre_name,
      GROUP_CONCAT(
        CONCAT(s.row_label, s.seat_number)
        ORDER BY s.row_label, s.seat_number
        SEPARATOR ','
      ) AS seat_labels
    FROM reservations r
    JOIN showtimes st  ON st.showtime_id = r.showtime_id
    JOIN shows sh      ON sh.show_id     = st.show_id
    JOIN theatres t    ON t.theatre_id   = sh.theatre_id
    LEFT JOIN reservation_seats rs ON rs.reservation_id = r.reservation_id
    LEFT JOIN seats s              ON s.seat_id         = rs.seat_id
    WHERE r.user_id = ?
    GROUP BY r.reservation_id, r.showtime_id, r.total_price, r.status, r.created_at,
             st.start_datetime, st.hall, sh.title, t.name
    ORDER BY r.created_at DESC
  `, [userId]);

  return rows.map(r => ({
    ...r,
    seat_labels: r.seat_labels ? r.seat_labels.split(',') : [],
  }));
}

// =============================================================
// FIND ONE (with ownership check)
// =============================================================
export async function findByIdForUser(reservationId, userId) {
  const rows = await pool.query(`
    SELECT
      r.reservation_id, r.user_id, r.showtime_id, r.total_price, r.status, r.created_at,
      st.start_datetime, st.hall,
      sh.title AS show_title, t.name AS theatre_name
    FROM reservations r
    JOIN showtimes st ON st.showtime_id = r.showtime_id
    JOIN shows sh     ON sh.show_id     = st.show_id
    JOIN theatres t   ON t.theatre_id   = sh.theatre_id
    WHERE r.reservation_id = ?
  `, [reservationId]);

  if (rows.length === 0) throw httpError(404, 'Reservation not found');
  if (Number(rows[0].user_id) !== Number(userId)) {
    throw httpError(403, 'Not your reservation');
  }

  const seats = await pool.query(`
    SELECT s.seat_id, s.row_label, s.seat_number, s.category
    FROM reservation_seats rs
    JOIN seats s ON s.seat_id = rs.seat_id
    WHERE rs.reservation_id = ?
    ORDER BY s.row_label, s.seat_number
  `, [reservationId]);

  return { ...rows[0], seats };
}

// =============================================================
// CANCEL
// =============================================================
export async function cancelReservation(userId, reservationId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log(`[tx] BEGIN  cancel  user=${userId} reservation=${reservationId}`);

    // Lock the reservation row
    const rows = await conn.query(
      `SELECT r.reservation_id, r.user_id, r.status, st.start_datetime
       FROM reservations r
       JOIN showtimes st ON st.showtime_id = r.showtime_id
       WHERE r.reservation_id = ?
       FOR UPDATE`,
      [reservationId]
    );
    if (rows.length === 0) throw httpError(404, 'Reservation not found');

    const r = rows[0];
    if (Number(r.user_id) !== Number(userId)) {
      throw httpError(403, 'Not your reservation');
    }
    if (r.status === 'cancelled') {
      throw httpError(409, 'Reservation already cancelled');
    }
    if (new Date(r.start_datetime) < new Date()) {
      throw httpError(400, 'Cannot cancel a past reservation');
    }

    // Lock and release the seats
    const seatRows = await conn.query(
      `SELECT s.seat_id FROM reservation_seats rs
       JOIN seats s ON s.seat_id = rs.seat_id
       WHERE rs.reservation_id = ?
       FOR UPDATE`,
      [reservationId]
    );
    const seatIds = seatRows.map(x => x.seat_id);

    if (seatIds.length > 0) {
      await conn.query(
        `UPDATE seats SET status = 'available'
         WHERE seat_id IN (${placeholders(seatIds.length)})`,
        seatIds
      );
    }

    await conn.query(
      `UPDATE reservations SET status = 'cancelled' WHERE reservation_id = ?`,
      [reservationId]
    );

    await conn.commit();
    console.log(`[tx] COMMIT cancel  reservation=${reservationId} released=${seatIds.length} seats`);
    return { reservation_id: reservationId, status: 'cancelled', released_seats: seatIds };
  } catch (err) {
    await conn.rollback();
    console.log(`[tx] ROLLBACK cancel  reason="${err.message}"`);
    throw err;
  } finally {
    conn.release();
  }
}

// =============================================================
// MODIFY (change seats inside same showtime)
// =============================================================
export async function modifyReservation(userId, reservationId, newSeatIds) {
  if (!Array.isArray(newSeatIds) || newSeatIds.length === 0) {
    throw httpError(400, 'seat_ids must be a non-empty array');
  }
  if (new Set(newSeatIds).size !== newSeatIds.length) {
    throw httpError(400, 'seat_ids must be unique');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    console.log(`[tx] BEGIN  modify  user=${userId} reservation=${reservationId} newSeats=[${newSeatIds}]`);

    // Lock the reservation row
    const rRows = await conn.query(
      `SELECT r.reservation_id, r.user_id, r.showtime_id, r.status
       FROM reservations r
       WHERE r.reservation_id = ?
       FOR UPDATE`,
      [reservationId]
    );
    if (rRows.length === 0) throw httpError(404, 'Reservation not found');

    const reservation = rRows[0];
    if (Number(reservation.user_id) !== Number(userId)) {
      throw httpError(403, 'Not your reservation');
    }
    if (reservation.status !== 'active') {
      throw httpError(409, 'Reservation is not active');
    }

    const showtime = await loadFutureShowtime(conn, reservation.showtime_id);
    const basePrice = Number(showtime.base_price);

    // Lock OLD seats
    const oldSeats = await conn.query(
      `SELECT s.seat_id FROM reservation_seats rs
       JOIN seats s ON s.seat_id = rs.seat_id
       WHERE rs.reservation_id = ?
       FOR UPDATE`,
      [reservationId]
    );
    const oldSeatIds = oldSeats.map(s => s.seat_id);

    // Lock NEW seats (could overlap with old — that's fine, MariaDB
    // handles duplicate locks from the same transaction gracefully).
    const newSeats = await conn.query(
      `SELECT seat_id, showtime_id, status, category
       FROM seats
       WHERE seat_id IN (${placeholders(newSeatIds.length)})
       FOR UPDATE`,
      newSeatIds
    );
    if (newSeats.length !== newSeatIds.length) {
      throw httpError(400, 'One or more new seat IDs do not exist');
    }
    const oldSeatSet = new Set(oldSeatIds.map(Number));
    for (const s of newSeats) {
      if (Number(s.showtime_id) !== Number(reservation.showtime_id)) {
        throw httpError(400, `Seat ${s.seat_id} does not belong to this showtime`);
      }
      // A seat is OK if it's available, OR if it was already part of this reservation
      const wasOurs = oldSeatSet.has(Number(s.seat_id));
      if (s.status !== 'available' && !wasOurs) {
        throw httpError(409, `Seat ${s.seat_id} is no longer available`);
      }
    }

    // Release old seats that are NOT in the new set
    const newSeatSet = new Set(newSeatIds.map(Number));
    const toRelease = oldSeatIds.filter(id => !newSeatSet.has(Number(id)));
    if (toRelease.length > 0) {
      await conn.query(
        `UPDATE seats SET status = 'available'
         WHERE seat_id IN (${placeholders(toRelease.length)})`,
        toRelease
      );
    }

    // Reserve new seats that were not already ours
    const toReserve = newSeatIds.filter(id => !oldSeatSet.has(Number(id)));
    if (toReserve.length > 0) {
      await conn.query(
        `UPDATE seats SET status = 'reserved'
         WHERE seat_id IN (${placeholders(toReserve.length)})`,
        toReserve
      );
    }

    // Replace reservation_seats links
    await conn.query(
      `DELETE FROM reservation_seats WHERE reservation_id = ?`,
      [reservationId]
    );
    await conn.batch(
      `INSERT INTO reservation_seats (reservation_id, seat_id) VALUES (?, ?)`,
      newSeatIds.map(id => [reservationId, id])
    );

    // Recompute total price
    const newTotal = newSeats.reduce((sum, s) => sum + priceFor(s, basePrice), 0);
    await conn.query(
      `UPDATE reservations SET total_price = ? WHERE reservation_id = ?`,
      [newTotal, reservationId]
    );

    await conn.commit();
    console.log(`[tx] COMMIT modify  reservation=${reservationId} released=${toRelease.length} reserved=${toReserve.length}`);
    return { reservation_id: reservationId, total_price: newTotal, seat_ids: newSeatIds };
  } catch (err) {
    await conn.rollback();
    console.log(`[tx] ROLLBACK modify  reason="${err.message}"`);
    throw err;
  } finally {
    conn.release();
  }
}
