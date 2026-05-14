import * as repo from '../repositories/reservationsRepo.js';
import { httpError } from '../utils/httpError.js';

export async function create(req, res, next) {
  try {
    const { showtime_id, seat_ids } = req.body || {};
    if (!showtime_id) throw httpError(400, 'showtime_id is required');
    if (!seat_ids)    throw httpError(400, 'seat_ids is required');
    const out = await repo.createReservation(req.user.id, showtime_id, seat_ids);
    res.status(201).json(out);
  } catch (e) { next(e); }
}

export async function listMine(req, res, next) {
  try {
    const data = await repo.findByUser(req.user.id);
    res.json(data);
  } catch (e) { next(e); }
}

export async function getOne(req, res, next) {
  try {
    const data = await repo.findByIdForUser(req.params.id, req.user.id);
    res.json(data);
  } catch (e) { next(e); }
}

export async function cancel(req, res, next) {
  try {
    const data = await repo.cancelReservation(req.user.id, req.params.id);
    res.json(data);
  } catch (e) { next(e); }
}

export async function modify(req, res, next) {
  try {
    const { seat_ids } = req.body || {};
    if (!seat_ids) throw httpError(400, 'seat_ids is required');
    const data = await repo.modifyReservation(req.user.id, req.params.id, seat_ids);
    res.json(data);
  } catch (e) { next(e); }
}
