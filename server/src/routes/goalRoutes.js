import { Router } from 'express';
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  analyzeGoalPreview,
  toggleGoalStatus,
  toggleSkillCompletion,
  addRequiredSkill,
  removeRequiredSkill,
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

// V3.5.1 Goal & Required-Skill Completion Controls
router.patch('/:id/status', requireEmailVerified, toggleGoalStatus);
router.patch('/:id/skills/toggle', requireEmailVerified, toggleSkillCompletion);
router.post('/:id/skills', requireEmailVerified, addRequiredSkill);
router.delete('/:id/skills/:skillName?', requireEmailVerified, removeRequiredSkill);

export default router;
