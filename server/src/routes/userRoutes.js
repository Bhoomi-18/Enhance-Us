import { Router } from 'express';
import {
  updateProfile,
  getPublicProfile,
  completeOnboarding,
  deleteAccount,
} from '../controllers/userController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.delete('/me', deleteAccount);
router.patch('/profile', updateProfile);
router.post('/onboarding/complete', completeOnboarding);
router.get('/:id', getPublicProfile);

export default router;
