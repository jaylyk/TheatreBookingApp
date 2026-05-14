import * as repo from '../repositories/theatresRepo.js';

export async function list(req, res, next) {
  try {
    const { location, q } = req.query;
    const data = await repo.findAll({ location, q });
    res.json(data);
  } catch (e) { next(e); }
}

export async function getOne(req, res, next) {
  try {
    const item = await repo.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Theatre not found' });
    res.json(item);
  } catch (e) { next(e); }
}
