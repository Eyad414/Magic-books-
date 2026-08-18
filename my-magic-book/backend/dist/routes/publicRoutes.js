"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const aiController_1 = require("../controllers/aiController");
const showcaseController_1 = require("../controllers/showcaseController");
const router = (0, express_1.Router)();
router.get('/settings', adminController_1.getPublicSettings);
router.get('/showcase-books', showcaseController_1.getShowcaseBooks);
router.get('/stories-page-books', showcaseController_1.getStoriesPageBooks);
router.post('/story-chat', aiController_1.storyChat);
exports.default = router;
//# sourceMappingURL=publicRoutes.js.map