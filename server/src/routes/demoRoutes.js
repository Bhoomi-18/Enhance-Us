import { Router } from 'express';
import {
  resetDemoWorkspace,
  getDemoStatus,
  dismissDemoTour,
  getBaselineMetadata,
} from '../controllers/demoController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Public metadata
router.get('/baseline', getBaselineMetadata);

// Authenticated Demo Workspace endpoints
router.post('/reset', authenticateUser, resetDemoWorkspace);
router.get('/status', authenticateUser, getDemoStatus);
router.post('/tour-dismiss', authenticateUser, dismissDemoTour);

export default router;
