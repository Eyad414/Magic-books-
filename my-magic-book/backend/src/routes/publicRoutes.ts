import { Router } from 'express';
import { getPublicSettings, trackVisit, checkCoupon, getLiveStats } from '../controllers/adminController';
import { storyChat } from '../controllers/aiController';
import { getShowcaseBooks, getStoriesPageBooks } from '../controllers/showcaseController';

const router = Router();

router.get('/settings', getPublicSettings);
// Counted from the database, so the hero can only claim what really happened.
router.get('/stats', getLiveStats);
router.get('/showcase-books', getShowcaseBooks);
router.get('/stories-page-books', getStoriesPageBooks);
router.post('/story-chat', storyChat);
// Anonymous visit counter — see models/Visit.
router.post('/visit', trackVisit);
// Says whether a discount code works. The order still recomputes the price.
router.post('/coupon', checkCoupon);

export default router;
