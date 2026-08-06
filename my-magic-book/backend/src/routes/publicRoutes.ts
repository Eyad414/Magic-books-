import { Router } from 'express';
import { getPublicSettings } from '../controllers/adminController';
import { storyChat } from '../controllers/aiController';
import { getShowcaseBooks } from '../controllers/showcaseController';

const router = Router();

router.get('/settings', getPublicSettings);
router.get('/showcase-books', getShowcaseBooks);
router.post('/story-chat', storyChat);

export default router;
