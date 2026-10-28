import { Router } from 'express';
import { createReport } from '../controllers/reportController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

// Authenticated users can submit a report against a profile, review, or content
router.post('/', requireEmailVerified, createReport);

export default router;
