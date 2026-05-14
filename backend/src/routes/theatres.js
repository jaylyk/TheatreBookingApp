import { Router } from 'express';
import * as ctrl from '../controllers/theatresController.js';

const router = Router();
router.get('/',    ctrl.list);
router.get('/:id', ctrl.getOne);
export default router;
