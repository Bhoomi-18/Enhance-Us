import { Router } from 'express';
import {
  postQuery,
  getConversation,
  clearConversation,
  evaluateAnswer,
} from '../controllers/assistantController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';

const router = Router();

// Protect all assistant endpoints with JWT / session authentication
router.use(authenticateUser);

// Contextual assistant query (rate-limited & email verified)
router.post('/query', requireEmailVerified, aiRateLimiter, postQuery);

// Knowledge check quiz evaluation
router.post('/evaluate', requireEmailVerified, evaluateAnswer);

// Retrieve conversation history for a roadmap
router.get('/conversation/:roadmapId', getConversation);

// Clear conversation history for a roadmap
router.delete('/conversation/:roadmapId', clearConversation);

export default router;
