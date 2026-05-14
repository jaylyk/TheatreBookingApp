import { Router } from 'express';
import * as reservationsCtrl from '../controllers/reservationsController.js';

const router = Router();
router.get('/reservations', reservationsCtrl.listMine);
export default router;
