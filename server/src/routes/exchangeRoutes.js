import { Router } from 'express';
import { createRequest, getRequests, acceptRequest, declineRequest, getConnections } from '../controllers/exchangeController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

router.post('/request', requireEmailVerified, createRequest);
router.get('/requests', getRequests);
router.get('/connections', getConnections);
router.post('/requests/:id/accept', requireEmailVerified, acceptRequest);
router.post('/requests/:id/decline', declineRequest);

export default router;
