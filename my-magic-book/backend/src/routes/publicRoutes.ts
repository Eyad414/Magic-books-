import { Router } from 'express';
import { getPublicSettings, trackVisit } from '../controllers/adminController';
import { storyChat } from '../controllers/aiController';
import { getShowcaseBooks, getStoriesPageBooks } from '../controllers/showcaseController';

const router = Router();

router.get('/settings', getPublicSettings);
router.get('/showcase-books', getShowcaseBooks);
router.get('/stories-page-books', getStoriesPageBooks);
router.post('/story-chat', storyChat);
// Anonymous visit counter — see models/Visit.
router.post('/visit', trackVisit);

export default router;
