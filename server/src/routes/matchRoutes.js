import { Router } from 'express';
import { getMatches, getMatch } from '../controllers/matchController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/', getMatches);
router.get('/:id', getMatch);

export default router;
