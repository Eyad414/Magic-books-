"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const storyRoutes_1 = __importDefault(require("./routes/storyRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Connect Database
(0, db_1.connectDB)();
// Middleware
app.use((0, cors_1.default)({
    origin: true, // Allow any origin dynamically (reflects the request origin)
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