import express from 'express';
import * as insightsController from '../controllers/insightsController.js';
import { optionalAuthenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get privacy-conscious aggregated community skill-gap insights
router.get('/community', optionalAuthenticateUser, insightsController.getCommunityInsights);

export default router;
