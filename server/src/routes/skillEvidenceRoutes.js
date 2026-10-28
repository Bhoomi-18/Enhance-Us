import { Router } from 'express';
import { addOrUpdateEvidence, deleteEvidence } from '../controllers/skillEvidenceController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

// User-managed skill evidence endpoints
router.put('/:skillName', requireEmailVerified, addOrUpdateEvidence);
router.post('/:skillName', requireEmailVerified, addOrUpdateEvidence);
router.delete('/:skillName', requireEmailVerified, deleteEvidence);

export default router;
