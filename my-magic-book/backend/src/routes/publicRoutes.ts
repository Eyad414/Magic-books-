import { Router } from 'express';
import { getSettings } from '../controllers/adminController';
import { testGeneratePdf } from '../controllers/storyController';

const router = Router();

router.get('/settings', getSettings);
router.get('/test-pdf', testGeneratePdf);

export default router;
