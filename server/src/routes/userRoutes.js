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
import { addOrUpdateEvidence, deleteEvidence } from '../controllers/skillEvidenceController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/dashboard', getDashboardFeed);
router.get('/notification-preferences', getNotificationPreferences);
router.put('/notification-preferences', updateNotificationPreferences);
router.post('/onboarding/complete', completeOnboarding);
router.post('/onboarding/dismiss', dismissOnboarding);
router.delete('/me', deleteAccount);
router.patch('/profile', updateProfile);

// Skill Evidence endpoints on user profile
router.put('/skills/:skillName/evidence', requireEmailVerified, addOrUpdateEvidence);
router.post('/skills/:skillName/evidence', requireEmailVerified, addOrUpdateEvidence);
router.delete('/skills/:skillName/evidence', requireEmailVerified, deleteEvidence);

router.get('/:id', getPublicProfile);

export default router;

