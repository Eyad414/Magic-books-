import { Router } from 'express';
import { getAllStories, updateStory, deleteStory, addAdmin, removeAdmin, getTeam, getSettings, updateSettings, getAllOrders, buildOrderBook, reRenderOrderFiles, printBook, printBookSubmit, generatePreviewIllustrations, generatePhotorealPreview, generateColoringPreview, listMessages, deleteMessage } from '../controllers/adminController';
import { protect, adminOnly } from '../utils/authMiddleware';

const router = Router();

router.use(protect, adminOnly);

router.get('/stories', getAllStories);
router.put('/stories/:id', updateStory);
router.delete('/stories/:id', deleteStory);

router.get('/orders', getAllOrders);
router.post('/orders/:id/build', buildOrderBook);
router.post('/orders/:id/rerender-files', reRenderOrderFiles);
router.post('/print-book', printBook);
router.post('/print-book/submit', printBookSubmit);

router.post('/team', addAdmin);
router.get('/team', getTeam);
router.delete('/team/:id', removeAdmin);

router.get('/messages', listMessages);
router.delete('/messages/:id', deleteMessage);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/themes/:themeId/generate-illustrations', generatePreviewIllustrations);
router.post('/themes/:themeId/generate-photoreal', generatePhotorealPreview);
router.post('/themes/:themeId/generate-coloring', generateColoringPreview);

export default router;
