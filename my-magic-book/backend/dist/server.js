"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load .env FIRST — before any import whose module-level code reads process.env
// (e.g. the Stripe client in orderController is created at import time).
require("dotenv/config");
const crypto_1 = require("crypto");
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./config/db");
const PaymentPoller_1 = require("./services/PaymentPoller");
const resetAdmin_1 = require("./utils/resetAdmin");
// Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const storyRoutes_1 = __importDefault(require("./routes/storyRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const publicRoutes_1 = __importDefault(require("./routes/publicRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const envFlag_1 = require("./utils/envFlag");
const sceneTemplates_1 = require("./services/sceneTemplates");
const UpscaleService_1 = require("./services/UpscaleService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5001;
// Connect Database, then run the one-shot admin reset if RESET_ADMIN_PASSWORD is set
(0, db_1.connectDB)().then(() => {
    (0, resetAdmin_1.maybeResetAdmin)();
    // BookPod has no webhook, so we ask it who paid. Starts only after the DB is
    // up — the poller reads Orders on its first tick.
    (0, PaymentPoller_1.startPaymentPolling)();
});
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
// Health check. Includes a small NON-SENSITIVE generation-config summary
// (booleans + model ids, never keys) so we can tell from outside which AI
// backend a deploy is actually using when generation silently falls back.
app.get('/api/health', async (req, res) => {
    const preferVertex = (0, envFlag_1.envFlag)('GENAI_USE_VERTEX');
    const studioAvailable = !!process.env.GEMINI_API_KEY;
    const vertexAvailable = !!process.env.GCP_PROJECT_ID;
    const body = {
        status: 'OK',
        message: 'My Magic Book API is running ✨',
        timestamp: new Date().toISOString(),
        genai: {
            // Generation tries the preferred backend, then automatically falls back to
            // the other on a credits/quota/auth failure — so it works as long as ONE
            // of these is available.
            preferVertex,
            order: preferVertex ? ['vertex', 'studio'] : ['studio', 'vertex'],
            vertexAvailable,
            studioAvailable,
            location: process.env.GCP_LOCATION || 'global',
            imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
        },
        // Which story scene-templates this build knows about (confirms deploys).
        stories: Object.keys(sceneTemplates_1.SCENE_TEMPLATES),
        // Fingerprint of the actual scene PROMPTS. The list above only names the
        // stories, so it stays identical when a prompt is rewritten — and firing a
        // regeneration at a server still running the old prompt spends real money
        // to reproduce the bug it was meant to fix. This changes whenever any
        // prompt does, so a deploy can be confirmed before paying for images.
        scenesHash: (0, crypto_1.createHash)('sha1').update(JSON.stringify(sceneTemplates_1.SCENE_TEMPLATES)).digest('hex').slice(0, 12),
        // Mail config — booleans and the FROM address only, never the API key.
        // A password-reset request answers the same way whether or not it sent
        // anything (so nobody can test which emails are registered), which also
        // means a silent misconfiguration looks exactly like success from outside.
        // This is the one place the setup can be checked without reading the host's
        // logs. `sharedSender` is the important one: Resend's onboarding address
        // only delivers to the address the Resend account was registered with, so
        // while it is true, mail to a CUSTOMER is rejected.
        mail: {
            configured: !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key',
            from: process.env.RESEND_FROM || 'Magic Fanoos <onboarding@resend.dev>',
            sharedSender: !(process.env.RESEND_FROM || '').includes('@') ||
                (process.env.RESEND_FROM || '').includes('resend.dev'),
            frontendUrl: (process.env.FRONTEND_URL || 'https://magicfanoos.com').replace(/\/$/, ''),
        },
        // The exact commit this server is running, from Render's own env var.
        // scenesHash only moves when a PROMPT changes, so a fix anywhere else —
        // the build path, a controller — deploys with no outward sign at all, and
        // the only way to tell was to pay for a build and watch what happened.
        commit: (process.env.RENDER_GIT_COMMIT || '').slice(0, 7) || 'local',
        // Which database this server is actually on — the NAME only, no host and
        // no credentials. Two deploys pointed at different databases once, and it
        // was invisible from outside: both answered every request perfectly well,
        // just about different data.
        db: mongoose_1.default.connection?.name || 'not connected',
    };
    // Diagnostic: ?probe=upscale actually calls the Imagen upscaler once (cached 5
    // min) so we can see the real HTTP status/error from this host's identity.
    if (req.query.probe === 'upscale')
        body.upscale = await (0, UpscaleService_1.upscaleProbe)();
    res.json(body);
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