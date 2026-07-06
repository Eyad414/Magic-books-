// Load .env FIRST — before any import whose module-level code reads process.env
// (e.g. the Stripe client in orderController is created at import time).
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
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

const app = express();
const PORT = process.env.PORT || 5001;

// Connect Database, then run the one-shot admin reset if RESET_ADMIN_PASSWORD is set
connectDB().then(() => {
  maybeResetAdmin();
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'My Magic Book API is running ✨', timestamp: new Date().toISOString() });
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
