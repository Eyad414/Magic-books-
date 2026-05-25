import { Router } from 'express';
import { register, login, getMe, makeMeAdmin } from '../controllers/authController';
import { protect, adminOnly } from '../utils/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/make-admin', protect, adminOnly, makeMeAdmin);

export default router;
