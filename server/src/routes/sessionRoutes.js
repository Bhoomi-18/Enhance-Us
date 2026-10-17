import { Router } from 'express';
import { createSession, getSessions, completeSession, cancelSession } from '../controllers/sessionController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', createSession);
router.get('/', getSessions);
router.post('/:id/complete', completeSession);
router.post('/:id/cancel', cancelSession);

export default router;
