import { Router } from 'express';
import {
  createStory,
  generateStory,
  generateAvatar,
  generateIllustrations,
  generatePageImage,
  getIllustrationStatus,
  customizeStory,
  getStoryPreview,
  getFullStory,
  getMyStories,
  deleteStory,
} from '../controllers/storyController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.get('/my', protect, getMyStories);
router.post('/create', protect, createStory);
// Single-page AI image generation (Nano Banana) — static path, keep before /:id
router.post('/generate-page-image', protect, generatePageImage);
router.post('/:id/generate', protect, generateStory);
router.post('/:id/generate-avatar', protect, generateAvatar);
router.post('/:id/generate-illustrations', protect, generateIllustrations);
router.get('/:id/illustration-status', protect, getIllustrationStatus);
router.put('/:id/customize', protect, customizeStory);
router.get('/:id/preview', getStoryPreview);
router.get('/:id/full', protect, getFullStory);
router.delete('/:id', protect, deleteStory);

export default router;
