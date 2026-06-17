import { Router } from 'express';
import multer from 'multer';
import { uploadChildPhoto, proxyImage } from '../controllers/uploadController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.post('/child-photo', upload.single('file'), uploadChildPhoto);
router.get('/image', proxyImage);

export default router;
