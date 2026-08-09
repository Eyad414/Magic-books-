import { Router } from 'express';
import { getPublicSettings } from '../controllers/adminController';
import { storyChat } from '../controllers/aiController';
import { getShowcaseBooks, getStoriesPageBooks } from '../controllers/showcaseController';

const router = Router();

router.get('/settings', getPublicSettings);
router.get('/showcase-books', getShowcaseBooks);
router.get('/stories-page-books', getStoriesPageBooks);
router.post('/story-chat', storyChat);

export default router;
