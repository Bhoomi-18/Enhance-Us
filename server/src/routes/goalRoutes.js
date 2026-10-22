import { Router } from 'express';
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  analyzeGoalPreview,
} from '../controllers/goalController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';

const router = Router();

// Protect all goal routes with authenticateUser
router.use(authenticateUser);

router.post('/analyze', requireEmailVerified, aiRateLimiter, analyzeGoalPreview);
router.post('/', requireEmailVerified, aiRateLimiter, createGoal);
router.get('/', getGoals);
router.get('/:id', getGoal);
router.patch('/:id', requireEmailVerified, updateGoal);
router.delete('/:id', requireEmailVerified, deleteGoal);

export default router;
