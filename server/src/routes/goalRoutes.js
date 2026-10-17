import { Router } from 'express';
import { createGoal, getGoals, getGoal, updateGoal, deleteGoal } from '../controllers/goalController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Protect all goal routes with authenticateUser
router.use(authenticateUser);

router.post('/', createGoal);
router.get('/', getGoals);
router.get('/:id', getGoal);
router.patch('/:id', updateGoal);
router.delete('/:id', deleteGoal);

export default router;
