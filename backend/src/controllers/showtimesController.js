import * as repo from '../repositories/showtimesRepo.js';

export async function listForShow(req, res, next) {
  try {
    const { date } = req.query;
    const data = await repo.findByShow(req.params.showId, { date });
    res.json(data);
  } catch (e) { next(e); }
}

export async function getOne(req, res, next) {
  try {
    const item = await repo.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Showtime not found' });
    res.json(item);
  } catch (e) { next(e); }
}
