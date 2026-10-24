import express from 'express';
import * as trustController from '../controllers/trustController.js';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Retrieve transparent trust and contribution profile for current authenticated user
router.get('/me', authenticateUser, (req, res, next) => {
  req.params.userId = req.user._id.toString();
  return trustController.getUserTrustProfile(req, res, next);
});

// Retrieve public/auditable trust profile for any peer by user ID
router.get('/:userId', optionalAuthenticateUser, trustController.getUserTrustProfile);

export default router;
