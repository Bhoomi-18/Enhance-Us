import { Router } from 'express';
import {
  generateRoadmapForGoal,
  getUserRoadmaps,
  getRoadmap,
  deleteRoadmap,
  analyzeRoadmapDependencies,
  updateMilestone,
  proposeMilestoneBreakdown,
  applyMilestoneBreakdown,
  initializeMilestones,
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

// V2.3 Milestone tracking & adaptive breakdown endpoints
router.patch('/:id/milestones/:milestoneId', updateMilestone);
router.post('/:id/milestones/:milestoneId/propose-breakdown', aiRateLimiter, proposeMilestoneBreakdown);
router.post('/:id/milestones/:milestoneId/apply-breakdown', applyMilestoneBreakdown);
router.post('/:id/milestones/initialize', initializeMilestones);

// Roadmap query and management endpoints
router.get('/', getUserRoadmaps);
router.get('/:id', getRoadmap);
router.delete('/:id', deleteRoadmap);

export default router;
