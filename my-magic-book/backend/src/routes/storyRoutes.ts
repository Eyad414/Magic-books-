import { Router } from 'express';
import {
  createStory,
  generateStory,
  customizeStory,
  getStoryPreview,
  getFullStory,
  getMyStories,
  deleteMyStory,
} from '../controllers/storyController';
import { protect } from '../utils/authMiddleware';

const router = Router();

router.get('/my', protect, getMyStories);
router.post('/create', protect, createStory);
router.post('/:id/generate', protect, generateStory);
router.put('/:id/customize', protect, customizeStory);
router.get('/:id/preview', getStoryPreview);
router.get('/:id/full', protect, getFullStory);
router.delete('/:id', protect, deleteMyStory);

export default router;
