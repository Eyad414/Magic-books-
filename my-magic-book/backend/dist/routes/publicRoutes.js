"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.get('/settings', adminController_1.getPublicSettings);
exports.default = router;
//# sourceMappingURL=publicRoutes.js.map