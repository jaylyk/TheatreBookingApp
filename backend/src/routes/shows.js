import { Router } from 'express';
import * as showsCtrl     from '../controllers/showsController.js';
import * as showtimesCtrl from '../controllers/showtimesController.js';

const router = Router();
router.get('/',                   showsCtrl.list);
router.get('/:id',                showsCtrl.getOne);
router.get('/:showId/showtimes',  showtimesCtrl.listForShow);
export default router;
