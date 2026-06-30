import { Router } from 'express';
import { getPublicSettings } from '../controllers/adminController';

const router = Router();

router.get('/settings', getPublicSettings);

export default router;
