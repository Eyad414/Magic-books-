"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storyController_1 = require("../controllers/storyController");
const coverPreviewController_1 = require("../controllers/coverPreviewController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.get('/my', authMiddleware_1.protect, storyController_1.getMyStories);
// Front-cover preview (costs a Gemini image) — must sit above '/:id/...'.
router.get('/cover-preview/quota', authMiddleware_1.protect, coverPreviewController_1.getCoverPreviewQuota);
router.post('/cover-preview', authMiddleware_1.protect, coverPreviewController_1.generateCoverPreview);
router.post('/create', authMiddleware_1.protect, storyController_1.createStory);
router.post('/:id/generate', authMiddleware_1.protect, storyController_1.generateStory);
router.put('/:id/customize', authMiddleware_1.protect, storyController_1.customizeStory);
router.get('/:id/preview', storyController_1.getStoryPreview);
router.get('/:id/full', authMiddleware_1.protect, storyController_1.getFullStory);
router.delete('/:id', authMiddleware_1.protect, storyController_1.deleteMyStory);
exports.default = router;
//# sourceMappingURL=storyRoutes.js.map