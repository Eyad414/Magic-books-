"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect, authMiddleware_1.adminOnly);
router.get('/stories', adminController_1.getAllStories);
router.put('/stories/:id', adminController_1.updateStory);
router.delete('/stories/:id', adminController_1.deleteStory);
router.get('/orders', adminController_1.getAllOrders);
// Records that a card payment arrived, without building or printing anything.
router.post('/orders/:id/confirm-payment', adminController_1.confirmOrderPayment);
router.post('/orders/:id/build', adminController_1.buildOrderBook);
router.get('/orders/:id/build-status', adminController_1.getOrderBuildStatus);
router.post('/orders/:id/rerender-files', adminController_1.reRenderOrderFiles);
router.post('/orders/:id/coloring/rerender', adminController_1.reRenderOrderColoring);
router.post('/orders/:id/coloring/submit', adminController_1.submitOrderColoring);
router.post('/check-payments', adminController_1.checkPayments);
router.post('/print-book', adminController_1.printBook);
router.post('/print-book/submit', adminController_1.printBookSubmit);
router.post('/team', adminController_1.addAdmin);
router.get('/team', adminController_1.getTeam);
router.delete('/team/:id', adminController_1.removeAdmin);
router.get('/messages', adminController_1.listMessages);
router.delete('/messages/:id', adminController_1.deleteMessage);
router.get('/customer', adminController_1.getCustomerByEmail);
// Which demo books have every image a printer needs — checked against storage.
router.get('/print-readiness', adminController_1.getPrintReadiness);
// A log of every book sent to the printer — demo books and imported ones kept
// no record at all before this.
router.get('/print-jobs', adminController_1.listPrintJobs);
// Accounts, sign-ins and what each person actually bought.
router.get('/customers', adminController_1.listCustomers);
// BILLABLE: prints and ships one finished demo book.
router.post('/print-readiness/send', adminController_1.sendReadyThemeBook);
router.get('/settings', adminController_1.getSettings);
router.put('/settings', adminController_1.updateSettings);
router.post('/themes/:themeId/generate-illustrations', adminController_1.generatePreviewIllustrations);
router.post('/themes/:themeId/generate-photoreal', adminController_1.generatePhotorealPreview);
router.post('/themes/:themeId/generate-coloring', adminController_1.generateColoringPreview);
// Re-impose a supplied book PDF onto a chosen trim. 60MB: a scanned interior is
// far heavier than the 10MB child photos the other upload route accepts.
const pdfUpload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });
router.post('/import-book', pdfUpload.single('file'), adminController_1.importBookPdf);
router.post('/import-book/submit', adminController_1.submitImportedBook);
// Designs real cover art for an imported book (page 1 of a manuscript is body text, not a cover).
router.post('/import-book/cover', adminController_1.designImportedCover);
// The owner's OWN cover file — for a real title this is usually the only cover
// that may legitimately go on the book.
router.post('/import-book/cover-upload', pdfUpload.single('file'), adminController_1.uploadImportedCover);
router.get('/import-book/files', adminController_1.listImportedFiles);
router.post('/import-book/files/delete', adminController_1.deleteImportedFiles);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map