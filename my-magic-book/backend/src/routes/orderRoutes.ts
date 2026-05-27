import { Router } from 'express';
import { createCheckout, stripeWebhook, getMyOrders, getStoryAccess } from '../controllers/orderController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.post('/webhook', stripeWebhook);
router.post('/checkout', protect, createCheckout);
router.get('/my', protect, getMyOrders);
router.get('/story/:storyId/access', protect, getStoryAccess);

export default router;
