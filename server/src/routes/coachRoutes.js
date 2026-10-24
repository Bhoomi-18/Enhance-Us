import express from 'express';
import * as coachController from '../controllers/coachController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';

const router = express.Router();

// Get personalized recommendations (with optional ?refresh=true)
router.get('/recommendations', authenticateUser, coachController.getRecommendations);

// Update recommendation status (ACCEPT, DISMISS, COMPLETE) with optional feedback
router.patch('/recommendations/:id', authenticateUser, coachController.updateRecommendation);

// Interactive conversational coaching queries with rate-limiting protection
router.post('/ask', authenticateUser, aiRateLimiter, coachController.askCoach);

export default router;
