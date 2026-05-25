import { Router } from 'express';
import multer from 'multer';
import { uploadPhoto } from '../controllers/uploadController';
import { protect } from '../utils/authMiddleware';

// Keep file in memory (no disk writes in Cloud Run)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

router.post('/photo', protect, upload.single('photo'), uploadPhoto);

export default router;
