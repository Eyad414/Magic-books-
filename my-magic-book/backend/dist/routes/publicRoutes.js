"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const storyController_1 = require("../controllers/storyController");
const router = (0, express_1.Router)();
router.get('/settings', adminController_1.getSettings);
router.get('/test-pdf', storyController_1.testGeneratePdf);
exports.default = router;
//# sourceMappingURL=publicRoutes.js.map