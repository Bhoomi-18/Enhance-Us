import { Router } from 'express';
import {
  getResources,
  getBookmarkedResources,
  toggleBookmark,
  rateResource,
} from '../controllers/resourceController.js';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Retrieve curated resources (requires authentication)
router.get('/', authenticateUser, getResources);

// Retrieve all resources bookmarked by authenticated user
router.get('/bookmarked', authenticateUser, getBookmarkedResources);

// Toggle bookmark for authenticated user
router.post('/:resourceId/bookmark', authenticateUser, toggleBookmark);

// Submit usefulness rating
router.post('/:resourceId/rate', authenticateUser, rateResource);

export default router;
