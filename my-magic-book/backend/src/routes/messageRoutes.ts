import { Router } from 'express';
import { protect } from '../utils/authMiddleware';
import { getMyMessages, getMyUnreadCount, replyToShop } from '../controllers/customerMessageController';

const router = Router();

// Every route here is about the signed-in customer's OWN messages; the user id
// comes from the token, never from the request, so one account cannot read
// another's thread by guessing an id.
router.get('/my', protect, getMyMessages);
router.get('/unread', protect, getMyUnreadCount);
router.post('/', protect, replyToShop);

export default router;
