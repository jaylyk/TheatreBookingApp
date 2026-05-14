import { Router } from 'express';
import * as ctrl from '../controllers/reservationsController.js';

const router = Router();
router.post  ('/',    ctrl.create);
router.get   ('/:id', ctrl.getOne);
router.patch ('/:id', ctrl.modify);
router.delete('/:id', ctrl.cancel);
export default router;
