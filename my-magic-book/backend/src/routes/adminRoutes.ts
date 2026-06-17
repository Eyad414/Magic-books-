import { Router } from 'express';
import { getAllStories, updateStory, deleteStory, addAdmin, getTeam, getSettings, updateSettings, getAllOrders, buildOrderBook, generatePreviewIllustrations, generatePhotorealPreview } from '../controllers/adminController';
import { protect, adminOnly } from '../utils/authMiddleware';

const router = Router();

router.use(protect, adminOnly);

router.get('/stories', getAllStories);
router.put('/stories/:id', updateStory);
router.delete('/stories/:id', deleteStory);

router.get('/orders', getAllOrders);
router.post('/orders/:id/build', buildOrderBook);

router.post('/team', addAdmin);
router.get('/team', getTeam);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/themes/:themeId/generate-illustrations', generatePreviewIllustrations);
router.post('/themes/:themeId/generate-photoreal', generatePhotorealPreview);

export default router;
