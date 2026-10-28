import { Router } from 'express';
import * as challengeController from '../controllers/challengeController.js';
import { authenticateUser, optionalAuthenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

// Challenge Discovery & User Participations
router.get('/', optionalAuthenticateUser, challengeController.getChallenges);
router.get('/user', authenticateUser, challengeController.getUserChallenges);
router.post('/', authenticateUser, requireEmailVerified, challengeController.createChallenge);

// Achievements (My / Public)
router.get('/achievements/my', authenticateUser, challengeController.getUserAchievements);
router.get('/achievements/user/:userId', challengeController.getPublicUserAchievements);

// Single Challenge Details, Edit & Cancel
router.get('/:id', optionalAuthenticateUser, challengeController.getChallengeById);
router.put('/:id', authenticateUser, challengeController.updateChallenge);
router.patch('/:id', authenticateUser, challengeController.updateChallenge);
router.post('/:id/cancel', authenticateUser, challengeController.cancelChallenge);

// Join & Leave
router.post('/:id/join', authenticateUser, challengeController.joinChallenge);
router.post('/:id/leave', authenticateUser, challengeController.leaveChallenge);

// Milestones
router.post('/:id/milestones/:milestoneId/complete', authenticateUser, challengeController.completeMilestone);
router.post('/:id/milestones/:milestoneId/undo', authenticateUser, challengeController.undoMilestone);

// Community Progress Updates
router.get('/:id/updates', optionalAuthenticateUser, challengeController.getChallengeUpdates);
router.post('/:id/updates', authenticateUser, challengeController.createChallengeUpdate);
router.delete('/:id/updates/:updateId', authenticateUser, challengeController.deleteChallengeUpdate);

export default router;
