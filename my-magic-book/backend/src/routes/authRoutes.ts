import { Router } from 'express';
import { register, login, getMe, makeMeAdmin, forgotPassword, resetPassword, googleLogin } from '../controllers/authController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
// One tap with Google — the ID token is verified server-side before trusting it.
router.post('/google', googleLogin);
// Both are public by necessity — someone who cannot log in cannot carry a token.
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/make-admin', protect, makeMeAdmin);

export default router;
