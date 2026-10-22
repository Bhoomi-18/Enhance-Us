import { Router } from 'express';
import { createSession, getSessions, completeSession, cancelSession } from '../controllers/sessionController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/', requireEmailVerified, createSession);
router.get('/', getSessions);
router.post('/:id/complete', requireEmailVerified, completeSession);
router.post('/:id/cancel', requireEmailVerified, cancelSession);

export default router;
