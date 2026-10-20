import { Router } from 'express';
import {
  generateRoadmapForGoal,
  getUserRoadmaps,
  getRoadmap,
  deleteRoadmap,
  analyzeRoadmapDependencies,
} from '../controllers/roadmapController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';

const router = Router();

// Protect all roadmap routes with JWT authentication
router.use(authenticateUser);

// AI generation endpoint protected by AI sliding-window rate limiter
router.post('/generate/:goalId', aiRateLimiter, generateRoadmapForGoal);

// Prerequisite & learning order analysis endpoint protected by AI rate limiter
router.post('/:id/analyze-dependencies', aiRateLimiter, analyzeRoadmapDependencies);
router.post('/:id/prerequisites', aiRateLimiter, analyzeRoadmapDependencies);

// Roadmap query and management endpoints
router.get('/', getUserRoadmaps);
router.get('/:id', getRoadmap);
router.delete('/:id', deleteRoadmap);

export default router;
