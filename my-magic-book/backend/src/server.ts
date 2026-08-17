// Load .env FIRST — before any import whose module-level code reads process.env
// (e.g. the Stripe client in orderController is created at import time).
import 'dotenv/config';
import { createHash } from 'crypto';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import { startPaymentPolling } from './services/PaymentPoller';
import { maybeResetAdmin } from './utils/resetAdmin';

// Routes
import authRoutes from './routes/authRoutes';
import storyRoutes from './routes/storyRoutes';
import orderRoutes from './routes/orderRoutes';
import contactRoutes from './routes/contactRoutes';
import adminRoutes from './routes/adminRoutes';
import userRoutes from './routes/userRoutes';
import publicRoutes from './routes/publicRoutes';
import uploadRoutes from './routes/uploadRoutes';
import { envFlag } from './utils/envFlag';
import { SCENE_TEMPLATES } from './services/sceneTemplates';
import { upscaleProbe } from './services/UpscaleService';

const app = express();
const PORT = process.env.PORT || 5001;

// Connect Database, then run the one-shot admin reset if RESET_ADMIN_PASSWORD is set
connectDB().then(() => {
  maybeResetAdmin();
  // BookPod has no webhook, so we ask it who paid. Starts only after the DB is
  // up — the poller reads Orders on its first tick.
  startPaymentPolling();
});

// Middleware
// In production, set CORS_ORIGINS to a comma-separated allowlist
// (e.g. "https://magicfanoos.com,https://www.magicfanoos.com").
// When unset (local dev) we reflect any origin for convenience.
const corsAllowlist = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: corsAllowlist.length ? corsAllowlist : true,
  credentials: true,
}));

// Stripe webhook needs raw body — must be before json middleware
app.use('/api/orders/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check. Includes a small NON-SENSITIVE generation-config summary
// (booleans + model ids, never keys) so we can tell from outside which AI
// backend a deploy is actually using when generation silently falls back.
app.get('/api/health', async (req, res) => {
  const preferVertex = envFlag('GENAI_USE_VERTEX');
  const studioAvailable = !!process.env.GEMINI_API_KEY;
  const vertexAvailable = !!process.env.GCP_PROJECT_ID;
  const body: Record<string, unknown> = {
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
    stories: Object.keys(SCENE_TEMPLATES),
    // Fingerprint of the actual scene PROMPTS. The list above only names the
    // stories, so it stays identical when a prompt is rewritten — and firing a
    // regeneration at a server still running the old prompt spends real money
    // to reproduce the bug it was meant to fix. This changes whenever any
    // prompt does, so a deploy can be confirmed before paying for images.
    scenesHash: createHash('sha1').update(JSON.stringify(SCENE_TEMPLATES)).digest('hex').slice(0, 12),
  };
  // Diagnostic: ?probe=upscale actually calls the Imagen upscaler once (cached 5
  // min) so we can see the real HTTP status/error from this host's identity.
  if (req.query.probe === 'upscale') body.upscale = await upscaleProbe();
  res.json(body);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/uploads', uploadRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 My Magic Book Server running at http://localhost:${PORT}`);
});

export default app;
