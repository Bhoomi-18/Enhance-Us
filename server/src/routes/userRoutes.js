import { Router } from 'express';
import {
  updateProfile,
  getPublicProfile,
  completeOnboarding,
  dismissOnboarding,
  getDashboardFeed,
  getNotificationPreferences,
  updateNotificationPreferences,
  deleteAccount,
} from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/dashboard', getDashboardFeed);
router.get('/notification-preferences', getNotificationPreferences);
router.put('/notification-preferences', updateNotificationPreferences);
router.post('/onboarding/complete', completeOnboarding);
router.post('/onboarding/dismiss', dismissOnboarding);
router.delete('/me', deleteAccount);
router.patch('/profile', updateProfile);
router.get('/:id', getPublicProfile);

export default router;

