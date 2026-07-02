"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load .env FIRST — before any import whose module-level code reads process.env
// (e.g. the Stripe client in orderController is created at import time).
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const storyRoutes_1 = __importDefault(require("./routes/storyRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Connect Database
(0, db_1.connectDB)();
// Middleware
// In production, set CORS_ORIGINS to a comma-separated allowlist
// (e.g. "https://magicfanoos.com,https://www.magicfanoos.com").
// When unset (local dev) we reflect any origin for convenience.
const corsAllowlist = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({
    origin: corsAllowlist.length ? corsAllowlist : true,
    credentials: true,
}));
// Stripe webhook needs raw body — must be before json middleware
app.use('/api/orders/webhook', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', message: 'My Magic Book API is running ✨', timestamp: new Date().toISOString() });
});
// API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/stories', storyRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/contact', contactRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/user', userRoutes_1.default);
app.use('/api/public', publicRoutes_1.default);
app.use('/api/uploads', uploadRoutes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// Global error handler
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});
app.listen(PORT, () => {
    console.log(`🚀 My Magic Book Server running at http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map