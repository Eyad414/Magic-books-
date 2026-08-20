import { Router } from 'express';
import multer from 'multer';
import { getAllStories, updateStory, deleteStory, addAdmin, removeAdmin, getTeam, getSettings, updateSettings, getAllOrders, confirmOrderPayment, buildOrderBook, getOrderBuildStatus, reRenderOrderFiles, reRenderOrderColoring, submitOrderColoring, printBook, printBookSubmit, generatePreviewIllustrations, generatePhotorealPreview, generateColoringPreview, sendBookToCustomer,
  importBookPdf,
  submitImportedBook,
  designImportedCover,
  uploadImportedCover,
  getPrintReadiness,
  listPrintJobs,
  listCustomers,
  listVisits,
  refreshPrintJobStatuses,
  sendReadyThemeBook,
  listImportedFiles,
  deleteImportedFiles, listMessages, deleteMessage, getCustomerByEmail, checkPayments } from '../controllers/adminController';
import { protect, adminOnly } from '../utils/authMiddleware';

import { sendMessageToCustomer, getCustomerThread, messageCounts, listConversations, markThreadRead } from '../controllers/customerMessageController';

const router = Router();

router.use(protect, adminOnly);

router.get('/stories', getAllStories);
router.put('/stories/:id', updateStory);
router.delete('/stories/:id', deleteStory);

router.get('/orders', getAllOrders);
// Records that a card payment arrived, without building or printing anything.
router.post('/orders/:id/confirm-payment', confirmOrderPayment);
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

// Which demo books have every image a printer needs — checked against storage.
router.get('/print-readiness', getPrintReadiness);
// A log of every book sent to the printer — demo books and imported ones kept
// no record at all before this.
router.get('/print-jobs', listPrintJobs);
// Read-only against BookPod: asks what happened to what we already sent.
router.post('/print-jobs/refresh', refreshPrintJobStatuses);
// Accounts, sign-ins and what each person actually bought.
router.get('/customers', listCustomers);
// Today's visits: what each browser did, and a name only if it signed in.
router.get('/visits', listVisits);
// BILLABLE: prints and ships one finished demo book.
router.post('/print-readiness/send', sendReadyThemeBook);
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/themes/:themeId/generate-illustrations', generatePreviewIllustrations);
router.post('/themes/:themeId/generate-photoreal', generatePhotorealPreview);
router.post('/themes/:themeId/generate-coloring', generateColoringPreview);
// Put a book the owner made into a customer's own account.
router.post('/books/send-to-customer', sendBookToCustomer);
// Writing to one customer, and whether they have read it.
router.get('/customer-messages', messageCounts);
router.get('/conversations', listConversations);
router.post('/customers/:userId/messages/read', markThreadRead);
router.get('/customers/:userId/messages', getCustomerThread);
router.post('/customers/:userId/message', sendMessageToCustomer);

// Re-impose a supplied book PDF onto a chosen trim. 60MB: a scanned interior is
// far heavier than the 10MB child photos the other upload route accepts.
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });
router.post('/import-book', pdfUpload.single('file'), importBookPdf);
router.post('/import-book/submit', submitImportedBook);
// Designs real cover art for an imported book (page 1 of a manuscript is body text, not a cover).
router.post('/import-book/cover', designImportedCover);
// The owner's OWN cover file — for a real title this is usually the only cover
// that may legitimately go on the book.
router.post('/import-book/cover-upload', pdfUpload.single('file'), uploadImportedCover);
router.get('/import-book/files', listImportedFiles);
router.post('/import-book/files/delete', deleteImportedFiles);

export default router;
