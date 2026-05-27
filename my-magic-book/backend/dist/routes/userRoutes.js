"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../utils/authMiddleware");
const router = (0, express_1.Router)();
router.put('/profile', authMiddleware_1.protect, userController_1.updateProfile);
router.put('/password', authMiddleware_1.protect, userController_1.changePassword);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map