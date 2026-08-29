import { Router } from 'express';
import { createCheckout, stripeWebhook, getMyOrders, downloadMyEbook } from '../controllers/orderController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.post('/webhook', stripeWebhook);
router.post('/checkout', protect, createCheckout);
router.get('/my', protect, getMyOrders);
// The buyer of a digital copy downloading the file they paid for. Ownership,
// payment and package are all re-checked in the controller.
router.get('/:id/ebook', protect, downloadMyEbook);

export default router;
