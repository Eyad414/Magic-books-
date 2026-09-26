import { Router } from 'express';
import multer from 'multer';
import { uploadChildPhoto, proxyImage } from '../controllers/uploadController';
import { ipRateLimit } from '../middleware/rateLimit';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

// Open by design — the photo is chosen in step 2 and the account wall is in
// step 3 — so it is capped per address instead. Twelve an hour is far above
// what ordering a book takes (one photo, a re-pick or two) and far below what
// makes this worth abusing as free image hosting.
const uploadLimiter = ipRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 12,
  message: 'حاولت رفع صور كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.',
});

router.post('/child-photo', uploadLimiter, upload.single('file'), uploadChildPhoto);
router.get('/image', proxyImage);

export default router;
