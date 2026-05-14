import * as repo from '../repositories/seatsRepo.js';

export async function listForShowtime(req, res, next) {
  try {
    const data = await repo.findByShowtime(req.params.showtimeId);
    res.json(data);
  } catch (e) { next(e); }
}
