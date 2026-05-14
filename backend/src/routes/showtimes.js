import { Router } from 'express';
import * as showtimesCtrl from '../controllers/showtimesController.js';
import * as seatsCtrl     from '../controllers/seatsController.js';

const router = Router();
router.get('/:id',              showtimesCtrl.getOne);
router.get('/:showtimeId/seats', seatsCtrl.listForShowtime);
export default router;
