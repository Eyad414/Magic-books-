"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const aiController_1 = require("../controllers/aiController");
const router = (0, express_1.Router)();
router.get('/settings', adminController_1.getPublicSettings);
router.post('/story-chat', aiController_1.storyChat);
exports.default = router;
//# sourceMappingURL=publicRoutes.js.map