"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.post('/webhook', orderController_1.stripeWebhook);
router.post('/checkout', authMiddleware_1.protect, orderController_1.createCheckout);
router.get('/my', authMiddleware_1.protect, orderController_1.getMyOrders);
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map