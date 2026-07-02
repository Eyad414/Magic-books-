"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storyController_1 = require("../controllers/storyController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.get('/my', authMiddleware_1.protect, storyController_1.getMyStories);
router.post('/create', authMiddleware_1.protect, storyController_1.createStory);
router.post('/:id/generate', authMiddleware_1.protect, storyController_1.generateStory);
router.put('/:id/customize', authMiddleware_1.protect, storyController_1.customizeStory);
router.get('/:id/preview', storyController_1.getStoryPreview);
router.get('/:id/full', authMiddleware_1.protect, storyController_1.getFullStory);
router.delete('/:id', authMiddleware_1.protect, storyController_1.deleteMyStory);
exports.default = router;
//# sourceMappingURL=storyRoutes.js.map