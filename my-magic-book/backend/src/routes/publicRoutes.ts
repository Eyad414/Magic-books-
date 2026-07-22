import { Router } from 'express';
import { getPublicSettings } from '../controllers/adminController';
import { storyChat } from '../controllers/aiController';

const router = Router();

router.get('/settings', getPublicSettings);
router.post('/story-chat', storyChat);

export default router;
