import { Router } from 'express';
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  analyzeGoalPreview,
} from '../controllers/goalController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';

const router = Router();

// Protect all goal routes with authenticateUser
router.use(authenticateUser);

router.post('/analyze', aiRateLimiter, analyzeGoalPreview);
router.post('/', aiRateLimiter, createGoal);
router.get('/', getGoals);
router.get('/:id', getGoal);
router.patch('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
