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
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/aiRateLimiter.js';

const router = Router();

// Protect all roadmap routes with JWT authentication
router.use(authenticateUser);

// AI generation endpoint protected by AI sliding-window rate limiter & verification
router.post('/generate/:goalId', requireEmailVerified, aiRateLimiter, generateRoadmapForGoal);

// Prerequisite & learning order analysis endpoint protected by AI rate limiter & verification
router.post('/:id/analyze-dependencies', requireEmailVerified, aiRateLimiter, analyzeRoadmapDependencies);
router.post('/:id/prerequisites', requireEmailVerified, aiRateLimiter, analyzeRoadmapDependencies);

// V2.3 Milestone tracking & adaptive breakdown endpoints
router.patch('/:id/milestones/:milestoneId', requireEmailVerified, updateMilestone);
router.post('/:id/milestones/:milestoneId/propose-breakdown', requireEmailVerified, aiRateLimiter, proposeMilestoneBreakdown);
router.post('/:id/milestones/:milestoneId/apply-breakdown', requireEmailVerified, applyMilestoneBreakdown);
router.post('/:id/milestones/initialize', requireEmailVerified, initializeMilestones);

// Roadmap query and management endpoints
router.get('/', getUserRoadmaps);
router.get('/:id', getRoadmap);
router.delete('/:id', deleteRoadmap);

export default router;
