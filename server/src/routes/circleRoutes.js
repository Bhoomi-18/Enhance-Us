import { Router } from 'express';
import * as circleController from '../controllers/circleController.js';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/authMiddleware.js';

const router = Router();

// Public / Member Circle Discovery
router.get('/', optionalAuthenticateUser, circleController.getCircles);
router.get('/:id', optionalAuthenticateUser, circleController.getCircleById);

// Authenticated Circle Lifecycle
router.post('/', authenticateUser, circleController.createCircle);
router.patch('/:id', authenticateUser, circleController.updateCircle);
router.post('/:id/join', authenticateUser, circleController.joinCircle);
router.post('/:id/leave', authenticateUser, circleController.leaveCircle);
router.post('/:id/close', authenticateUser, circleController.closeCircle);

// Member Management & Moderation
router.patch('/:id/requests/:requestId', authenticateUser, circleController.manageJoinRequest);
router.patch('/:id/members/:userId/role', authenticateUser, circleController.updateMemberRole);
router.delete('/:id/members/:userId', authenticateUser, circleController.removeMember);

// Collaborative Roadmap & Milestones
router.post('/:id/milestones', authenticateUser, circleController.addMilestone);
router.patch('/:id/milestones/:milestoneId', authenticateUser, circleController.updateMilestone);
router.post('/:id/milestones/:milestoneId/tasks', authenticateUser, circleController.addTask);
router.patch('/:id/milestones/:milestoneId/tasks/:taskId/toggle', authenticateUser, circleController.toggleTask);

// Group Sessions
router.post('/:id/sessions', authenticateUser, circleController.proposeSession);
router.get('/:id/sessions', optionalAuthenticateUser, circleController.getSessions);
router.post('/sessions/:sessionId/rsvp', authenticateUser, circleController.rsvpSession);

// Collaborative Discussions & Announcements
router.get('/:id/posts', optionalAuthenticateUser, circleController.getPosts);
router.post('/:id/posts', authenticateUser, circleController.createPost);
router.post('/:id/posts/:postId/replies', authenticateUser, circleController.addReply);
router.delete('/:id/posts/:postId', authenticateUser, circleController.deletePost);

export default router;
