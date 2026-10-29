import mongoose from 'mongoose';
import Workspace from '../models/workspaceModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { recordEvent } from './analyticsService.js';
import { ApiError } from '../utils/apiError.js';
import { validateHttpUrl } from './skillEvidenceService.js';
import { checkAndAwardAchievement } from './achievementService.js';
export { validateHttpUrl };

/**
 * Creates a new collaborative workspace.
 */
export const createWorkspace = async (userId, workspaceData) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const { title, description, associatedSkill, associatedGoalTitle, visibility } = workspaceData || {};

  const cleanTitle = (title || '').trim();
  if (cleanTitle.length === 0) throw new ApiError(400, 'Workspace title is required');
  if (cleanTitle.length > 100) throw new ApiError(400, 'Workspace title cannot exceed 100 characters');

  const cleanDesc = (description || '').trim();
  if (cleanDesc.length === 0) throw new ApiError(400, 'Workspace description is required');
  if (cleanDesc.length > 1000) throw new ApiError(400, 'Workspace description cannot exceed 1000 characters');

  const cleanSkill = (associatedSkill || '').trim();
  if (cleanSkill.length === 0) throw new ApiError(400, 'Associated skill or learning domain is required');

  const vis = visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const workspace = await Workspace.create({
    title: cleanTitle,
    description: cleanDesc,
    associatedSkill: cleanSkill,
    associatedGoalTitle: (associatedGoalTitle || '').trim(),
    owner: userId,
    visibility: vis,
    members: [
      {
        user: userId,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    ],
    invitations: [],
    milestones: [],
    resources: [],
    notes: {
      content: '',
      lastUpdatedBy: userId,
      updatedAt: new Date(),
    },
    discussions: [],
  });

  recordEvent({
    eventType: 'workspace_created',
    userId,
    metadata: {
      workspaceId: workspace._id,
      visibility: vis,
      associatedSkill: cleanSkill,
      isDemo: Boolean(user.isDemo),
    },
  }).catch(() => {});

  return await Workspace.findById(workspace._id)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .lean();
};

/**
 * Returns all workspaces the user belongs to as a member or owner, plus pending invites.
 */
export const getUserWorkspaces = async (userId) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const workspaces = await Workspace.find({
    'members.user': userObjectId,
    isArchived: false,
  })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 })
    .lean();

  // Also query pending invitations for this user
  const invitations = await Workspace.find({
    'invitations.user': userObjectId,
    'invitations.status': 'PENDING',
    isArchived: false,
  })
    .select('title description associatedSkill owner visibility createdAt')
    .populate('owner', 'name email avatar')
    .lean();

  return {
    workspaces: workspaces.map((ws) => {
      const completed = (ws.milestones || []).filter((m) => m.status === 'COMPLETED').length;
      const total = (ws.milestones || []).length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { ...ws, progress };
    }),
    pendingInvitations: invitations,
  };
};

/**
 * Returns discoverable public workspaces.
 */
export const getDiscoverableWorkspaces = async (userId, query = {}) => {
  const filter = {
    visibility: 'PUBLIC',
    isArchived: false,
  };

  if (query.skill) {
    filter.associatedSkill = new RegExp(query.skill.trim(), 'i');
  }

  const workspaces = await Workspace.find(filter)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return workspaces.map((ws) => {
    const completed = (ws.milestones || []).filter((m) => m.status === 'COMPLETED').length;
    const total = (ws.milestones || []).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isMember = (ws.members || []).some((m) => m.user?._id?.toString() === userId.toString());
    return { ...ws, progress, isMember };
  });
};

/**
 * Retrieves a single workspace by ID with strict server-side authorization check.
 */
export const getWorkspaceById = async (workspaceId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    throw new ApiError(404, 'Workspace not found');
  }

  const workspace = await Workspace.findById(workspaceId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('invitations.user', 'name email avatar')
    .populate('invitations.invitedBy', 'name email avatar')
    .populate('milestones.assignedTo', 'name email avatar')
    .populate('milestones.completedBy', 'name email avatar')
    .populate('resources.addedBy', 'name email avatar')
    .populate('notes.lastUpdatedBy', 'name email avatar')
    .populate('discussions.author', 'name email avatar')
    .lean();

  if (!workspace) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId?.toString();
  const isMember = (workspace.members || []).some((m) => m.user?._id?.toString() === userIdStr);
  const isOwner = workspace.owner?._id?.toString() === userIdStr;

  // Strict authorization: private workspaces are only visible to confirmed members or owner
  if (workspace.visibility === 'PRIVATE' && !isMember && !isOwner) {
    throw new ApiError(403, 'Access denied: You are not a member of this private collaborative workspace');
  }

  const completed = (workspace.milestones || []).filter((m) => m.status === 'COMPLETED').length;
  const total = (workspace.milestones || []).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const currentMemberRecord = (workspace.members || []).find((m) => m.user?._id?.toString() === userIdStr);
  const userRole = isOwner ? 'OWNER' : currentMemberRecord?.role || (isMember ? 'MEMBER' : 'GUEST');

  return {
    ...workspace,
    progress,
    isMember,
    isOwner,
    userRole,
  };
};

/**
 * Updates workspace settings (Owner/Admin only).
 */
export const updateWorkspace = async (workspaceId, userId, updateData) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const member = ws.members.find((m) => m.user.toString() === userIdStr);
  const isOwner = ws.owner.toString() === userIdStr;
  const isAdmin = member?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Permission denied: Only workspace owner or admins can modify workspace details');
  }

  const { title, description, associatedSkill, visibility, isArchived } = updateData || {};

  if (title !== undefined) ws.title = title.trim();
  if (description !== undefined) ws.description = description.trim();
  if (associatedSkill !== undefined) ws.associatedSkill = associatedSkill.trim();
  if (visibility !== undefined && ['PRIVATE', 'PUBLIC'].includes(visibility)) ws.visibility = visibility;
  if (isArchived !== undefined) ws.isArchived = Boolean(isArchived);

  await ws.save();
  return await getWorkspaceById(workspaceId, userId);
};

/**
 * Invites a registered platform user to join the workspace.
 */
export const inviteMember = async (workspaceId, userId, targetUserId) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const isOwner = ws.owner.toString() === userIdStr;
  const member = ws.members.find((m) => m.user.toString() === userIdStr);
  const isAdmin = member?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Only workspace owners or admins can invite new members');
  }

  if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ApiError(400, 'Valid user ID is required to send an invitation');
  }

  const targetIdStr = targetUserId.toString();
  if (targetIdStr === userIdStr) {
    throw new ApiError(400, 'You cannot invite yourself');
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) throw new ApiError(404, 'Target user does not exist');

  const alreadyMember = ws.members.some((m) => m.user.toString() === targetIdStr);
  if (alreadyMember) {
    throw new ApiError(400, `${targetUser.name} is already a member of this workspace`);
  }

  const pendingInvite = ws.invitations.find(
    (inv) => inv.user.toString() === targetIdStr && inv.status === 'PENDING'
  );
  if (pendingInvite) {
    throw new ApiError(409, `An invitation has already been sent to ${targetUser.name} and is currently pending`);
  }

  ws.invitations.push({
    user: targetUserId,
    invitedBy: userId,
    status: 'PENDING',
    createdAt: new Date(),
  });

  await ws.save();

  // Create in-app notification
  try {
    const inviter = await User.findById(userId);
    await Notification.create({
      recipient: targetUserId,
      sender: userId,
      type: 'WORKSPACE_INVITE',
      title: 'Workspace Invitation Received',
      message: `${inviter?.name || 'A peer'} invited you to collaborate in the workspace "${ws.title}".`,
      link: `/workspaces/${ws._id}`,
    });
  } catch (err) {
    console.warn('[Notification Warning]', err.message);
  }

  return { message: `Invitation sent to ${targetUser.name} successfully` };
};

/**
 * Responds to a workspace invitation (ACCEPT or DECLINE).
 */
export const respondToInvitation = async (workspaceId, userId, response) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const invite = ws.invitations.find(
    (inv) => inv.user.toString() === userIdStr && inv.status === 'PENDING'
  );

  if (!invite) {
    throw new ApiError(404, 'No pending invitation found for you in this workspace');
  }

  const upperResponse = (response || '').toUpperCase();
  if (!['ACCEPT', 'DECLINE'].includes(upperResponse)) {
    throw new ApiError(400, 'Response must be either ACCEPT or DECLINE');
  }

  if (upperResponse === 'ACCEPT') {
    invite.status = 'ACCEPTED';
    const isAlreadyMember = ws.members.some((m) => m.user.toString() === userIdStr);
    if (!isAlreadyMember) {
      ws.members.push({
        user: userId,
        role: 'MEMBER',
        joinedAt: new Date(),
      });
    }
  } else {
    invite.status = 'DECLINED';
  }

  await ws.save();
  const populatedWs = await Workspace.findById(workspaceId)
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('invitations.user', 'name email avatar');

  return {
    message: upperResponse === 'ACCEPT' ? 'Joined workspace successfully' : 'Invitation declined',
    status: invite.status,
    workspace: populatedWs,
  };
};

/**
 * Removes a member from the workspace or allows a member to leave.
 */
export const removeMember = async (workspaceId, userId, targetMemberUserId) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const targetIdStr = targetMemberUserId.toString();
  const isOwner = ws.owner.toString() === userIdStr;
  const isSelf = userIdStr === targetIdStr;

  if (ws.owner.toString() === targetIdStr) {
    throw new ApiError(400, 'The workspace owner cannot be removed. Transfer ownership or archive the workspace instead.');
  }

  const callerMember = ws.members.find((m) => m.user.toString() === userIdStr);
  const isCallerAdmin = callerMember?.role === 'ADMIN';

  if (!isSelf && !isOwner && !isCallerAdmin) {
    throw new ApiError(403, 'Permission denied: Only workspace owner, admins, or the user themselves can remove membership');
  }

  ws.members = ws.members.filter((m) => m.user.toString() !== targetIdStr);
  await ws.save();

  return { message: isSelf ? 'You have left the workspace' : 'Member removed successfully' };
};

/**
 * Adds a milestone to the workspace.
 */
export const addMilestone = async (workspaceId, userId, milestoneData) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const isMember = ws.members.some((m) => m.user.toString() === userIdStr);
  if (!isMember) {
    throw new ApiError(403, 'Only workspace members can add shared milestones');
  }

  const { title, description, assignedTo, dueDate } = milestoneData || {};
  const cleanTitle = (title || '').trim();
  if (cleanTitle.length === 0) throw new ApiError(400, 'Milestone title is required');
  if (cleanTitle.length > 150) throw new ApiError(400, 'Milestone title cannot exceed 150 characters');

  let assignedUser = null;
  if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
    const isAssigneeMember = ws.members.some((m) => m.user.toString() === assignedTo.toString());
    if (isAssigneeMember) assignedUser = assignedTo;
  }

  const newMilestone = {
    title: cleanTitle,
    description: (description || '').trim(),
    status: (milestoneData?.status && ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(milestoneData.status)) ? milestoneData.status : 'PENDING',
    assignedTo: assignedUser,
    dueDate: dueDate ? new Date(dueDate) : null,
    createdAt: new Date(),
  };

  ws.milestones.push(newMilestone);
  await ws.save();

  return ws.milestones[ws.milestones.length - 1];
};

/**
 * Updates a milestone (status, assignee, description).
 */
export const updateMilestone = async (workspaceId, userId, milestoneId, updateData) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const isMember = ws.members.some((m) => m.user.toString() === userIdStr);
  if (!isMember) {
    throw new ApiError(403, 'Only workspace members can update milestones');
  }

  const milestone = ws.milestones.id(milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  const { title, description, status, assignedTo, dueDate } = updateData || {};

  if (title !== undefined) milestone.title = title.trim();
  if (description !== undefined) milestone.description = description.trim();
  if (dueDate !== undefined) milestone.dueDate = dueDate ? new Date(dueDate) : null;

  if (assignedTo !== undefined) {
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      const isAssigneeMember = ws.members.some((m) => m.user.toString() === assignedTo.toString());
      milestone.assignedTo = isAssigneeMember ? assignedTo : null;
    } else {
      milestone.assignedTo = null;
    }
  }

  if (status !== undefined && ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
    milestone.status = status;
    if (status === 'COMPLETED') {
      milestone.completedAt = new Date();
      milestone.completedBy = userId;
    } else {
      milestone.completedAt = null;
      milestone.completedBy = null;
    }
  }

  await ws.save();

  if (status === 'COMPLETED') {
    try {
      await checkAndAwardAchievement(userId, 'WORKSPACE_CONTRIBUTOR', {
        workspaceId,
        milestoneId,
        milestoneTitle: milestone.title,
      });
    } catch (achieveErr) {
      console.warn('[Workspace Achievement Warning]', achieveErr.message);
    }
  }

  return milestone;
};

/**
 * Deletes a milestone.
 */
export const deleteMilestone = async (workspaceId, userId, milestoneId) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const member = ws.members.find((m) => m.user.toString() === userIdStr);
  const isOwner = ws.owner.toString() === userIdStr;
  const isAdmin = member?.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'Only workspace owners or admins can remove milestones');
  }

  ws.milestones = ws.milestones.filter((m) => m._id.toString() !== milestoneId.toString());
  await ws.save();

  return { message: 'Milestone removed successfully' };
};

/**
 * Adds a resource link to the workspace.
 */
export const addResource = async (workspaceId, userId, resourceData) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const isMember = ws.members.some((m) => m.user.toString() === userIdStr);
  if (!isMember) {
    throw new ApiError(403, 'Only workspace members can add shared resources');
  }

  const { title, url, description } = resourceData || {};
  const cleanTitle = (title || '').trim();
  if (cleanTitle.length === 0) throw new ApiError(400, 'Resource title is required');

  const cleanUrl = validateHttpUrl(url, 'Resource URL');
  if (!cleanUrl) throw new ApiError(400, 'Valid HTTP/HTTPS resource URL is required');

  const newResource = {
    title: cleanTitle,
    url: cleanUrl,
    description: (description || '').trim(),
    addedBy: userId,
    addedAt: new Date(),
  };

  ws.resources.push(newResource);
  await ws.save();

  return ws.resources[ws.resources.length - 1];
};

/**
 * Removes a resource link from the workspace.
 */
export const deleteResource = async (workspaceId, userId, resourceId) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const resItem = ws.resources.id(resourceId);
  if (!resItem) throw new ApiError(404, 'Resource not found');

  const userIdStr = userId.toString();
  const isOwner = ws.owner.toString() === userIdStr;
  const isCreator = resItem.addedBy.toString() === userIdStr;
  const member = ws.members.find((m) => m.user.toString() === userIdStr);
  const isAdmin = member?.role === 'ADMIN';

  if (!isOwner && !isCreator && !isAdmin) {
    throw new ApiError(403, 'Permission denied to remove this resource');
  }

  ws.resources = ws.resources.filter((r) => r._id.toString() !== resourceId.toString());
  await ws.save();

  return { message: 'Resource removed successfully' };
};

/**
 * Updates shared workspace notes.
 */
export const updateNotes = async (workspaceId, userId, content) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const isMember = ws.members.some((m) => m.user.toString() === userIdStr);
  if (!isMember) {
    throw new ApiError(403, 'Only workspace members can update notes');
  }

  const cleanContent = typeof content === 'string' ? content : '';
  if (cleanContent.length > 5000) {
    throw new ApiError(400, 'Notes content cannot exceed 5000 characters');
  }

  ws.notes = {
    content: cleanContent,
    lastUpdatedBy: userId,
    updatedAt: new Date(),
  };

  await ws.save();
  return ws.notes;
};

/**
 * Posts a message in the workspace discussion feed.
 */
export const addDiscussionMessage = async (workspaceId, userId, content) => {
  const ws = await Workspace.findById(workspaceId);
  if (!ws) throw new ApiError(404, 'Workspace not found');

  const userIdStr = userId.toString();
  const isMember = ws.members.some((m) => m.user.toString() === userIdStr);
  if (!isMember) {
    throw new ApiError(403, 'Only workspace members can participate in discussions');
  }

  const cleanContent = (content || '').trim();
  if (cleanContent.length === 0) {
    throw new ApiError(400, 'Message cannot be empty');
  }
  if (cleanContent.length > 1000) {
    throw new ApiError(400, 'Message cannot exceed 1000 characters');
  }

  const msg = {
    author: userId,
    content: cleanContent,
    createdAt: new Date(),
  };

  ws.discussions.push(msg);
  await ws.save();

  const savedMsg = ws.discussions[ws.discussions.length - 1];
  const user = await User.findById(userId).select('name email avatar').lean();

  return {
    _id: savedMsg._id,
    content: savedMsg.content,
    createdAt: savedMsg.createdAt,
    author: user,
  };
};

export default {
  createWorkspace,
  getUserWorkspaces,
  getDiscoverableWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  inviteMember,
  respondToInvitation,
  removeMember,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addResource,
  deleteResource,
  updateNotes,
  addDiscussionMessage,
};
