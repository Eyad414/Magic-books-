import { Router } from 'express';
import multer from 'multer';
import { getAllStories, updateStory, deleteStory, addAdmin, removeAdmin, getTeam, getSettings, updateSettings, getAllOrders, buildOrderBook, getOrderBuildStatus, reRenderOrderFiles, reRenderOrderColoring, submitOrderColoring, printBook, printBookSubmit, generatePreviewIllustrations, generatePhotorealPreview, generateColoringPreview,
  importBookPdf,
  submitImportedBook,
  listImportedFiles,
  deleteImportedFiles, listMessages, deleteMessage, getCustomerByEmail, checkPayments } from '../controllers/adminController';
import { protect, adminOnly } from '../utils/authMiddleware';

const router = Router();

router.use(protect, adminOnly);

router.get('/stories', getAllStories);
router.put('/stories/:id', updateStory);
router.delete('/stories/:id', deleteStory);

router.get('/orders', getAllOrders);
router.post('/orders/:id/build', buildOrderBook);
router.get('/orders/:id/build-status', getOrderBuildStatus);
router.post('/orders/:id/rerender-files', reRenderOrderFiles);
router.post('/orders/:id/coloring/rerender', reRenderOrderColoring);
router.post('/orders/:id/coloring/submit', submitOrderColoring);
router.post('/check-payments', checkPayments);
router.post('/print-book', printBook);
router.post('/print-book/submit', printBookSubmit);

router.post('/team', addAdmin);
router.get('/team', getTeam);
router.delete('/team/:id', removeAdmin);

router.get('/messages', listMessages);
router.delete('/messages/:id', deleteMessage);
router.get('/customer', getCustomerByEmail);

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/themes/:themeId/generate-illustrations', generatePreviewIllustrations);
router.post('/themes/:themeId/generate-photoreal', generatePhotorealPreview);
router.post('/themes/:themeId/generate-coloring', generateColoringPreview);

// Re-impose a supplied book PDF onto a chosen trim. 60MB: a scanned interior is
// far heavier than the 10MB child photos the other upload route accepts.
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });
router.post('/import-book', pdfUpload.single('file'), importBookPdf);
router.post('/import-book/submit', submitImportedBook);
router.get('/import-book/files', listImportedFiles);
router.post('/import-book/files/delete', deleteImportedFiles);

export default router;
