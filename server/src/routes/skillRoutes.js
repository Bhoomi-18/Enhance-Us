import { Router } from 'express';
import { getSkills, createSkill } from '../controllers/skillController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', getSkills);
router.post('/', authenticateUser, createSkill);

export default router;
