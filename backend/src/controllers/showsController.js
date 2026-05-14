import * as repo from '../repositories/showsRepo.js';

export async function list(req, res, next) {
  try {
    const { theatreId, title } = req.query;
    const data = await repo.findAll({ theatreId, title });
    res.json(data);
  } catch (e) { next(e); }
}

export async function getOne(req, res, next) {
  try {
    const item = await repo.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Show not found' });
    res.json(item);
  } catch (e) { next(e); }
}
