"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.protect, authMiddleware_1.adminOnly);
router.get('/stories', adminController_1.getAllStories);
router.put('/stories/:id', adminController_1.updateStory);
router.delete('/stories/:id', adminController_1.deleteStory);
router.get('/orders', adminController_1.getAllOrders);
router.post('/team', adminController_1.addAdmin);
router.get('/team', adminController_1.getTeam);
router.get('/settings', adminController_1.getSettings);
router.put('/settings', adminController_1.updateSettings);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map