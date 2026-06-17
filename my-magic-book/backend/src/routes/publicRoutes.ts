import { Router } from 'express';
import { getPublicSettings } from '../controllers/adminController';
import { testGeneratePdf } from '../controllers/storyController';

const router = Router();

router.get('/settings', getPublicSettings);
router.get('/test-pdf', testGeneratePdf);

export default router;
