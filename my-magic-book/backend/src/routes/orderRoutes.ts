import { Router } from 'express';
import { createCheckout, stripeWebhook, getMyOrders, getTransferDetails } from '../controllers/orderController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.post('/webhook', stripeWebhook);
router.post('/checkout', protect, createCheckout);
router.get('/my', protect, getMyOrders);
router.get('/transfer-details', protect, getTransferDetails);

export default router;
