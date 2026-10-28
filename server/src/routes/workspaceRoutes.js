import { Router } from 'express';
import * as workspaceController from '../controllers/workspaceController.js';
import { authenticateUser, requireEmailVerified } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateUser);

// Workspace Discovery & User Membership
router.get('/', workspaceController.getUserWorkspaces);
router.get('/me', workspaceController.getUserWorkspaces);
router.get('/discover', workspaceController.getDiscoverableWorkspaces);
router.post('/', requireEmailVerified, workspaceController.createWorkspace);

// Single Workspace Details & Settings
router.get('/:id', workspaceController.getWorkspaceById);
router.patch('/:id', workspaceController.updateWorkspace);

// Invitations & Membership
router.post('/:id/invite', requireEmailVerified, workspaceController.inviteMember);
router.post('/:id/invitation/respond', workspaceController.respondToInvitation);
router.post('/:id/respond', workspaceController.respondToInvitation);
router.delete('/:id/members/:memberId', workspaceController.removeMember);

// Milestones
router.post('/:id/milestones', workspaceController.addMilestone);
router.patch('/:id/milestones/:milestoneId', workspaceController.updateMilestone);
router.delete('/:id/milestones/:milestoneId', workspaceController.deleteMilestone);

// Shared Resources
router.post('/:id/resources', workspaceController.addResource);
router.delete('/:id/resources/:resourceId', workspaceController.deleteResource);

// Shared Notes (Support both PATCH and PUT)
router.patch('/:id/notes', workspaceController.updateNotes);
router.put('/:id/notes', workspaceController.updateNotes);

// Discussions
router.post('/:id/discussions', workspaceController.addDiscussionMessage);

export default router;
