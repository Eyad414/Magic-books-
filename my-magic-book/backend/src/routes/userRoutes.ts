import { Router } from 'express';
import { updateProfile, changePassword } from '../controllers/userController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

export default router;
