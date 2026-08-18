"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
// Both are public by necessity — someone who cannot log in cannot carry a token.
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
router.get('/me', authMiddleware_1.protect, authController_1.getMe);
router.put('/make-admin', authMiddleware_1.protect, authController_1.makeMeAdmin);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map