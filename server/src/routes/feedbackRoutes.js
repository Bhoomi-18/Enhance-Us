import { Router } from 'express';
import { submitFeedback } from '../controllers/feedbackController.js';
import { feedbackRateLimiter, resetFeedbackRateLimiter } from '../middleware/feedbackRateLimiter.js';
import { optionalAuthenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Test helper: reset rate limiter in development/test
if (process.env.NODE_ENV !== 'production') {
  router.post('/reset-limiter', (req, res) => {
    resetFeedbackRateLimiter();
    res.json({ reset: true });
  });
}

// POST /api/feedback - Public & Authenticated feedback submission with rate limiting
router.post('/', optionalAuthenticateUser, feedbackRateLimiter, submitFeedback);

export default router;

