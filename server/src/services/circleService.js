import mongoose from 'mongoose';
import Circle from '../models/circleModel.js';
import CirclePost from '../models/circlePostModel.js';
import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';

// In-Memory Stores for offline test mode (MOCK_DB=true)
export const mockCirclesStore = [];
export const mockCirclePostsStore = [];

/**
 * Helper to dispatch in-app notifications safely without blocking or throwing.
 */
const safeDispatchNotification = async (recipientId, senderId, type, title, message, link) => {
  try {
    if (Circle.db?.readyState === 1) {
      await Notification.create({
        recipient: recipientId,
        sender: senderId || null,
        type,
        title,
        message,
        link,
      });
    }
  } catch (err) {
    console.warn('[Circle Notification Warning]', err.message);
  }
};

/**
 * Browses circles with keyword search, skill filter, level filter, and pagination.
 */
export const getCircles = async (filters = {}, pagination = {}, viewer = null) => {
  const { search, skill, level, policy, onlyMy = false } = filters;
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const viewerIdStr = viewer?._id ? viewer._id.toString() : viewer ? viewer.toString() : null;

  // Mock DB Mode
  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    let result = mockCirclesStore.filter((c) => c.status !== 'CLOSED');

    if (onlyMy && viewerIdStr) {
      result = result.filter((c) =>
        c.members.some((m) => (m.user?._id || m.user).toString() === viewerIdStr)
      );
    } else {
      // Filter out INVITE_ONLY circles if viewer is not a member
      result = result.filter((c) => {
        if (c.membershipPolicy !== 'INVITE_ONLY') return true;
        if (!viewerIdStr) return false;
        return c.members.some((m) => (m.user?._id || m.user).toString() === viewerIdStr);
      });
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.primarySkill.toLowerCase().includes(q)
      );
    }

    if (skill) {
      const norm = normalizeSkillName(skill).toLowerCase();
      result = result.filter((c) => c.primarySkill.toLowerCase() === norm);
    }

    if (level && level !== 'ALL_LEVELS') {
      result = result.filter((c) => c.skillLevel === level || c.skillLevel === 'ALL_LEVELS');
    }

    if (policy) {
      result = result.filter((c) => c.membershipPolicy === policy);
    }

    const total = result.length;
    const paginated = result.slice(skip, skip + limit);

    return {
      circles: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Real MongoDB Mode: strictly isolate public discovery from demo circles
  const query = { status: { $ne: 'CLOSED' }, isDemo: { $ne: true } };

  if (onlyMy && viewerIdStr) {
    query['members.user'] = viewerIdStr;
  } else {
    // If not searching own circles, hide INVITE_ONLY circles unless viewer is already a member
    if (viewerIdStr) {
      query.$or = [
        { membershipPolicy: { $ne: 'INVITE_ONLY' } },
        { 'members.user': viewerIdStr },
      ];
    } else {
      query.membershipPolicy = { $ne: 'INVITE_ONLY' };
    }
  }

  if (search && search.trim()) {
    const q = search.trim();
    const regex = new RegExp(q, 'i');
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: regex },
        { description: regex },
        { primarySkill: regex },
        { secondarySkills: { $in: [regex] } },
      ],
    });
  }

  if (skill && skill.trim()) {
    const norm = normalizeSkillName(skill);
    query.primarySkill = new RegExp(`^${norm}$`, 'i');
  }

  if (level && level !== 'ALL_LEVELS') {
    query.skillLevel = { $in: [level, 'ALL_LEVELS'] };
  }

  if (policy && policy.trim()) {
    query.membershipPolicy = policy.trim();
  }

  const [circles, total] = await Promise.all([
    Circle.find(query)
      .populate('owner', 'name email avatar reputation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Circle.countDocuments(query),
  ]);

  return {
    circles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieves circle details, membership status, and viewer permissions.
 */
export const getCircleById = async (circleId, viewer = null) => {
  const viewerIdStr = viewer?._id ? viewer._id.toString() : viewer ? viewer.toString() : null;

  let circle;
  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    circle = mockCirclesStore.find((c) => c._id === circleId || c._id?.toString() === circleId?.toString());
  } else {
    circle = await Circle.findById(circleId)
      .populate('owner', 'name email avatar reputation')
      .populate('members.user', 'name email avatar reputation skills availability timezone')
      .populate('joinRequests.user', 'name email avatar reputation skills');
  }

  if (!circle) {
    throw new ApiError(404, 'Learning circle not found');
  }

  // Check member status
  const memberRecord = (circle.members || []).find(
    (m) => (m.user?._id || m.user).toString() === viewerIdStr
  );

  const isOwner = (circle.owner?._id || circle.owner).toString() === viewerIdStr;
  const isModerator = isOwner || memberRecord?.role === 'MODERATOR';
  const isMember = Boolean(memberRecord);

  // Invite-only circles require membership to view details
  if (circle.membershipPolicy === 'INVITE_ONLY' && !isMember) {
    throw new ApiError(403, 'This is a private, invite-only learning circle. Access is restricted.');
  }

  const pendingRequest = (circle.joinRequests || []).find(
    (r) => (r.user?._id || r.user).toString() === viewerIdStr && r.status === 'PENDING'
  );

  return {
    circle,
    viewerPermissions: {
      isOwner,
      isModerator,
      isMember,
      role: memberRecord?.role || (isOwner ? 'OWNER' : null),
      hasPendingRequest: Boolean(pendingRequest),
      pendingRequestId: pendingRequest?._id || null,
    },
  };
};

/**
 * Creates a new learning circle, making creator the owner and first member.
 */
export const createCircle = async (userId, data) => {
  const {
    title,
    description,
    primarySkill,
    secondarySkills = [],
    learningObjectives = [],
    skillLevel = 'ALL_LEVELS',
    memberLimit = 20,
    membershipPolicy = 'OPEN',
  } = data || {};

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Circle title is required');
  }
  if (!description || !description.trim()) {
    throw new ApiError(400, 'Circle description is required');
  }
  if (!primarySkill || !primarySkill.trim()) {
    throw new ApiError(400, 'Primary skill or topic is required');
  }

  const limitNum = Math.min(50, Math.max(2, parseInt(memberLimit, 10) || 20));
  const normSkill = normalizeSkillName(primarySkill);
  const userIdStr = (userId?._id || userId).toString();

  const initialMember = {
    user: userId,
    role: 'OWNER',
    joinedAt: new Date(),
  };

  const circleData = {
    title: title.trim(),
    description: description.trim(),
    primarySkill: normSkill,
    secondarySkills: Array.isArray(secondarySkills) ? secondarySkills.map((s) => s.trim()).filter(Boolean) : [],
    learningObjectives: Array.isArray(learningObjectives) ? learningObjectives.map((o) => o.trim()).filter(Boolean) : [],
    skillLevel,
    owner: userId,
    members: [initialMember],
    memberLimit: limitNum,
    membershipPolicy,
    status: 'ACTIVE',
    roadmap: [],
    joinRequests: [],
    activityLog: [
      {
        action: 'CIRCLE_CREATED',
        performedBy: userId,
        details: `Learning circle created with policy: ${membershipPolicy}`,
        timestamp: new Date(),
      },
    ],
  };

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    const mockCircle = {
      _id: 'mock_circle_' + Date.now(),
      ...circleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCirclesStore.push(mockCircle);
    return mockCircle;
  }

  const circle = await Circle.create(circleData);
  return await circle.populate('owner', 'name email avatar');
};

/**
 * Updates circle metadata and policies (Owner / Moderator only).
 */
export const updateCircle = async (circleId, userId, updateData) => {
  const userIdStr = (userId?._id || userId).toString();
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isModerator) {
    throw new ApiError(403, 'Forbidden: Only the owner or appointed moderators can edit circle details');
  }

  const { title, description, primarySkill, secondarySkills, learningObjectives, skillLevel, memberLimit, membershipPolicy } = updateData || {};

  // Policy and member limit changes require OWNER role
  if ((membershipPolicy || memberLimit) && !viewerPermissions.isOwner) {
    throw new ApiError(403, 'Forbidden: Only the circle owner can change membership policies or limits');
  }

  if (title) circle.title = title.trim();
  if (description) circle.description = description.trim();
  if (primarySkill) circle.primarySkill = normalizeSkillName(primarySkill);
  if (secondarySkills) circle.secondarySkills = secondarySkills;
  if (learningObjectives) circle.learningObjectives = learningObjectives;
  if (skillLevel) circle.skillLevel = skillLevel;
  if (membershipPolicy) circle.membershipPolicy = membershipPolicy;
  if (memberLimit) {
    const newLimit = Math.min(50, Math.max(circle.members.length, parseInt(memberLimit, 10)));
    circle.memberLimit = newLimit;
  }

  circle.activityLog = circle.activityLog || [];
  circle.activityLog.push({
    action: 'CIRCLE_UPDATED',
    performedBy: userId,
    details: 'Circle details updated by ' + (viewerPermissions.isOwner ? 'owner' : 'moderator'),
    timestamp: new Date(),
  });

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return circle;
  }

  await circle.save();
  return circle;
};

/**
 * Joins an OPEN circle immediately, or submits a join request for an APPLY_TO_JOIN circle.
 */
export const joinCircle = async (circleId, userId, payload = {}) => {
  const userIdStr = (userId?._id || userId).toString();
  const { message = '' } = payload;

  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (circle.status !== 'ACTIVE') {
    throw new ApiError(400, 'This circle is not currently active');
  }

  if (viewerPermissions.isMember) {
    throw new ApiError(400, 'You are already a member of this learning circle');
  }

  // Enforce member limit
  if (circle.members.length >= circle.memberLimit) {
    throw new ApiError(400, `Circle has reached its maximum capacity of ${circle.memberLimit} members`);
  }

  // 1. OPEN policy -> Instant Join
  if (circle.membershipPolicy === 'OPEN') {
    circle.members.push({
      user: userId,
      role: 'MEMBER',
      joinedAt: new Date(),
    });

    circle.activityLog = circle.activityLog || [];
    circle.activityLog.push({
      action: 'MEMBER_JOINED',
      performedBy: userId,
      details: 'Joined circle via open enrollment',
      timestamp: new Date(),
    });

    if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
      return { status: 'JOINED', circle };
    }

    await circle.save();

    // Notify owner
    const ownerId = circle.owner?._id || circle.owner;
    await safeDispatchNotification(
      ownerId,
      userId,
      'CIRCLE_REQUEST_ACCEPTED',
      'New Member Joined Circle',
      `A new peer has joined ${circle.title}`,
      `/circles/${circle._id}`
    );

    return { status: 'JOINED', circle };
  }

  // 2. APPLY_TO_JOIN policy -> Submit Join Request
  if (circle.membershipPolicy === 'APPLY_TO_JOIN') {
    const existingReq = (circle.joinRequests || []).find(
      (r) => (r.user?._id || r.user).toString() === userIdStr && r.status === 'PENDING'
    );
    if (existingReq) {
      throw new ApiError(400, 'You already have a pending join request for this circle');
    }

    const newRequest = {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      message: message.trim(),
      status: 'PENDING',
      requestedAt: new Date(),
    };

    circle.joinRequests.push(newRequest);

    if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
      return { status: 'REQUEST_SUBMITTED', circle };
    }

    await circle.save();

    // Notify owner & moderators
    const ownerId = circle.owner?._id || circle.owner;
    await safeDispatchNotification(
      ownerId,
      userId,
      'CIRCLE_JOIN_REQUEST',
      'New Circle Join Request',
      `A peer requested to join ${circle.title}: "${message.slice(0, 80)}"`,
      `/circles/${circle._id}`
    );

    return { status: 'REQUEST_SUBMITTED', circle };
  }

  // 3. INVITE_ONLY -> Disallow direct join
  throw new ApiError(403, 'This circle is invite-only. You must be invited by an owner or moderator to join.');
};

/**
 * Leave a circle. Owner cannot leave without transferring ownership or closing the circle.
 */
export const leaveCircle = async (circleId, userId) => {
  const userIdStr = (userId?._id || userId).toString();
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isMember) {
    throw new ApiError(400, 'You are not a member of this circle');
  }

  if (viewerPermissions.isOwner && circle.members.length > 1) {
    throw new ApiError(
      400,
      'As circle owner, you must transfer ownership to another member before leaving, or close the circle.'
    );
  }

  circle.members = circle.members.filter(
    (m) => (m.user?._id || m.user).toString() !== userIdStr
  );

  circle.activityLog = circle.activityLog || [];
  circle.activityLog.push({
    action: 'MEMBER_LEFT',
    performedBy: userId,
    details: 'Member left the circle',
    timestamp: new Date(),
  });

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return { success: true };
  }

  await circle.save();
  return { success: true };
};

/**
 * Manages membership join requests (Accept / Reject). Owner / Moderator only.
 */
export const manageJoinRequest = async (circleId, requestId, action, reviewerId) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, reviewerId);

  if (!viewerPermissions.isModerator) {
    throw new ApiError(403, 'Forbidden: Only circle owners and moderators can review join requests');
  }

  const reqIndex = (circle.joinRequests || []).findIndex(
    (r) => r._id.toString() === requestId.toString()
  );

  if (reqIndex === -1) {
    throw new ApiError(404, 'Join request not found');
  }

  const joinReq = circle.joinRequests[reqIndex];
  if (joinReq.status !== 'PENDING') {
    throw new ApiError(400, `This request has already been ${joinReq.status.toLowerCase()}`);
  }

  const applicantId = joinReq.user?._id || joinReq.user;

  if (action === 'ACCEPT') {
    if (circle.members.length >= circle.memberLimit) {
      throw new ApiError(400, 'Cannot accept request: circle is at maximum member limit');
    }

    // Add to members
    circle.members.push({
      user: applicantId,
      role: 'MEMBER',
      joinedAt: new Date(),
    });

    joinReq.status = 'ACCEPTED';
    joinReq.reviewedBy = reviewerId;
    joinReq.reviewedAt = new Date();

    circle.activityLog = circle.activityLog || [];
    circle.activityLog.push({
      action: 'JOIN_REQUEST_ACCEPTED',
      performedBy: reviewerId,
      targetUser: applicantId,
      details: 'Join request accepted by moderator',
      timestamp: new Date(),
    });

    if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
      return { success: true, status: 'ACCEPTED' };
    }

    await circle.save();

    await safeDispatchNotification(
      applicantId,
      reviewerId,
      'CIRCLE_REQUEST_ACCEPTED',
      'Circle Join Request Accepted',
      `Welcome! Your request to join ${circle.title} has been accepted.`,
      `/circles/${circle._id}`
    );

    return { success: true, status: 'ACCEPTED' };
  } else if (action === 'REJECT') {
    joinReq.status = 'REJECTED';
    joinReq.reviewedBy = reviewerId;
    joinReq.reviewedAt = new Date();

    if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
      return { success: true, status: 'REJECTED' };
    }

    await circle.save();
    return { success: true, status: 'REJECTED' };
  }

  throw new ApiError(400, 'Invalid request action. Must be ACCEPT or REJECT');
};

/**
 * Manages member role (Appoint Moderator, Demote, or Transfer Ownership).
 */
export const updateMemberRole = async (circleId, targetUserId, newRole, requesterId) => {
  const requesterIdStr = (requesterId?._id || requesterId).toString();
  const targetIdStr = (targetUserId?._id || targetUserId).toString();

  const { circle, viewerPermissions } = await getCircleById(circleId, requesterId);

  // Only the current OWNER can change roles or transfer ownership
  if (!viewerPermissions.isOwner) {
    throw new ApiError(403, 'Forbidden: Only the circle owner can manage member roles');
  }

  const targetMember = circle.members.find(
    (m) => (m.user?._id || m.user).toString() === targetIdStr
  );
  if (!targetMember) {
    throw new ApiError(404, 'Specified user is not a member of this circle');
  }

  // Ownership transfer
  if (newRole === 'OWNER') {
    circle.owner = targetUserId;
    targetMember.role = 'OWNER';

    // Demote old owner to MODERATOR
    const oldOwnerMember = circle.members.find(
      (m) => (m.user?._id || m.user).toString() === requesterIdStr
    );
    if (oldOwnerMember) oldOwnerMember.role = 'MODERATOR';

    circle.activityLog = circle.activityLog || [];
    circle.activityLog.push({
      action: 'OWNERSHIP_TRANSFERRED',
      performedBy: requesterId,
      targetUser: targetUserId,
      details: 'Circle ownership transferred to member',
      timestamp: new Date(),
    });

    if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
      return { success: true, role: 'OWNER' };
    }

    await circle.save();
    return { success: true, role: 'OWNER' };
  }

  if (newRole === 'MODERATOR' || newRole === 'MEMBER') {
    targetMember.role = newRole;

    circle.activityLog = circle.activityLog || [];
    circle.activityLog.push({
      action: 'ROLE_UPDATED',
      performedBy: requesterId,
      targetUser: targetUserId,
      details: `Member role set to ${newRole}`,
      timestamp: new Date(),
    });

    if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
      return { success: true, role: newRole };
    }

    await circle.save();
    return { success: true, role: newRole };
  }

  throw new ApiError(400, 'Invalid role. Must be OWNER, MODERATOR, or MEMBER');
};

/**
 * Removes a member from the circle.
 */
export const removeMember = async (circleId, targetUserId, requesterId) => {
  const targetIdStr = (targetUserId?._id || targetUserId).toString();
  const { circle, viewerPermissions } = await getCircleById(circleId, requesterId);

  if (!viewerPermissions.isModerator) {
    throw new ApiError(403, 'Forbidden: Only owners and moderators can remove members');
  }

  const targetMember = circle.members.find(
    (m) => (m.user?._id || m.user).toString() === targetIdStr
  );
  if (!targetMember) {
    throw new ApiError(404, 'User is not a member of this circle');
  }

  if (targetMember.role === 'OWNER') {
    throw new ApiError(400, 'Cannot remove the circle owner');
  }

  // Moderators cannot remove other moderators; only owner can
  if (targetMember.role === 'MODERATOR' && !viewerPermissions.isOwner) {
    throw new ApiError(403, 'Forbidden: Only the owner can remove moderators');
  }

  circle.members = circle.members.filter(
    (m) => (m.user?._id || m.user).toString() !== targetIdStr
  );

  circle.activityLog = circle.activityLog || [];
  circle.activityLog.push({
    action: 'MEMBER_REMOVED',
    performedBy: requesterId,
    targetUser: targetUserId,
    details: 'Member removed by moderation action',
    timestamp: new Date(),
  });

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return { success: true };
  }

  await circle.save();
  return { success: true };
};

/**
 * Closes or archives a circle. Owner only.
 */
export const closeCircle = async (circleId, userId) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isOwner) {
    throw new ApiError(403, 'Forbidden: Only the circle owner can close or archive this circle');
  }

  circle.status = 'CLOSED';
  circle.activityLog = circle.activityLog || [];
  circle.activityLog.push({
    action: 'CIRCLE_CLOSED',
    performedBy: userId,
    details: 'Circle closed by owner',
    timestamp: new Date(),
  });

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return { success: true, status: 'CLOSED' };
  }

  await circle.save();
  return { success: true, status: 'CLOSED' };
};

// =========================================================================
// COLLABORATIVE ROADMAP & MILESTONES
// =========================================================================

/**
 * Adds a new milestone to the circle roadmap.
 */
export const addCircleMilestone = async (circleId, milestoneData, userId) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isModerator) {
    throw new ApiError(403, 'Forbidden: Only circle owners and moderators can add shared roadmap milestones');
  }

  const { title, description, targetDate, completionCriteria } = milestoneData || {};
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Milestone title is required');
  }

  const newMilestone = {
    _id: new mongoose.Types.ObjectId(),
    title: title.trim(),
    description: description ? description.trim() : '',
    targetDate: targetDate ? new Date(targetDate) : null,
    completionCriteria: completionCriteria ? completionCriteria.trim() : '',
    status: 'NOT_STARTED',
    tasks: [],
    resources: [],
  };

  circle.roadmap.push(newMilestone);

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return newMilestone;
  }

  await circle.save();
  return newMilestone;
};

/**
 * Updates a circle milestone status (e.g. COMPLETED by group agreement).
 */
export const updateCircleMilestone = async (circleId, milestoneId, updateData, userId) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isModerator) {
    throw new ApiError(403, 'Forbidden: Only circle owners and moderators can modify milestone status');
  }

  const milestone = circle.roadmap.id ? circle.roadmap.id(milestoneId) : circle.roadmap.find((m) => m._id.toString() === milestoneId.toString());
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found in circle roadmap');
  }

  const { title, description, targetDate, completionCriteria, status } = updateData || {};

  if (title) milestone.title = title.trim();
  if (description !== undefined) milestone.description = description.trim();
  if (targetDate) milestone.targetDate = new Date(targetDate);
  if (completionCriteria !== undefined) milestone.completionCriteria = completionCriteria.trim();

  if (status && status !== milestone.status) {
    milestone.status = status;
    if (status === 'COMPLETED') {
      milestone.completedAt = new Date();
      milestone.completedBy = userId;
    } else {
      milestone.completedAt = null;
      milestone.completedBy = null;
    }
  }

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return milestone;
  }

  await circle.save();
  return milestone;
};

/**
 * Adds an actionable task to a milestone.
 */
export const addMilestoneTask = async (circleId, milestoneId, taskData, userId) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isMember) {
    throw new ApiError(403, 'Forbidden: You must be a member of this circle to contribute tasks');
  }

  const milestone = circle.roadmap.id ? circle.roadmap.id(milestoneId) : circle.roadmap.find((m) => m._id.toString() === milestoneId.toString());
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found');
  }

  const { title, description, assignedTo = [], linkUrl = '' } = taskData || {};
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Task title is required');
  }

  const newTask = {
    _id: new mongoose.Types.ObjectId(),
    title: title.trim(),
    description: description ? description.trim() : '',
    assignedTo: Array.isArray(assignedTo) ? assignedTo : [userId],
    completedBy: [],
    isCompleted: false,
    linkUrl: linkUrl ? linkUrl.trim() : '',
  };

  milestone.tasks.push(newTask);

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return newTask;
  }

  await circle.save();
  return newTask;
};

/**
 * Toggles an individual member's task completion state.
 */
export const toggleMilestoneTask = async (circleId, milestoneId, taskId, userId) => {
  const userIdStr = (userId?._id || userId).toString();
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isMember) {
    throw new ApiError(403, 'Forbidden: You must be a member of this circle');
  }

  const milestone = circle.roadmap.id ? circle.roadmap.id(milestoneId) : circle.roadmap.find((m) => m._id.toString() === milestoneId.toString());
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found');
  }

  const task = milestone.tasks.id ? milestone.tasks.id(taskId) : milestone.tasks.find((t) => t._id.toString() === taskId.toString());
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const completedIndex = task.completedBy.findIndex(
    (u) => (u._id || u).toString() === userIdStr
  );

  if (completedIndex > -1) {
    task.completedBy.splice(completedIndex, 1);
  } else {
    task.completedBy.push(userId);
  }

  task.isCompleted = task.completedBy.length > 0;

  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return task;
  }

  await circle.save();
  return task;
};

// =========================================================================
// GROUP SESSIONS & RSVP
// =========================================================================

/**
 * Proposes a group session linked to the circle.
 */
export const proposeGroupSession = async (circleId, sessionData, userId) => {
  const userIdStr = (userId?._id || userId).toString();
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isMember) {
    throw new ApiError(403, 'Forbidden: You must be a circle member to schedule a group session');
  }

  const { title, description, date, time, durationMinutes = 60, meetingUrl = '', maxParticipants } = sessionData || {};

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Group session title is required');
  }
  if (!date) {
    throw new ApiError(400, 'Session date is required');
  }
  if (!time) {
    throw new ApiError(400, 'Session time is required');
  }

  const scheduledDate = new Date(`${date}T${time}`);
  if (isNaN(scheduledDate.getTime())) {
    throw new ApiError(400, 'Invalid date or time format');
  }

  if (scheduledDate.getTime() < Date.now() - 15 * 60 * 1000) {
    throw new ApiError(400, 'Session must be scheduled in the future');
  }

  const capacity = maxParticipants ? Math.min(50, Math.max(2, parseInt(maxParticipants, 10))) : circle.memberLimit;

  // Auto RSVP host
  const initialRsvp = {
    user: userId,
    status: 'GOING',
    rsvpAt: new Date(),
  };

  const groupSessionData = {
    circle: circleId,
    title: title.trim(),
    sessionNotes: description ? description.trim() : '',
    date: scheduledDate,
    time: time.slice(0, 5),
    durationMinutes: Number(durationMinutes) || 60,
    skillTaught: circle.primarySkill,
    host: userId,
    participants: [userId],
    isGroupSession: true,
    maxParticipants: capacity,
    meetingUrl: meetingUrl ? meetingUrl.trim() : '',
    status: 'SCHEDULED',
    rsvps: [initialRsvp],
  };

  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    const { mockSessionsStore } = await import('./sessionService.js');
    const mockSession = {
      _id: 'mock_group_sess_' + Date.now(),
      ...groupSessionData,
      createdAt: new Date().toISOString(),
    };
    mockSessionsStore.push(mockSession);
    return mockSession;
  }

  const session = await Session.create(groupSessionData);

  // Notify other circle members
  const memberIds = circle.members
    .map((m) => (m.user?._id || m.user).toString())
    .filter((id) => id !== userIdStr);

  for (const mId of memberIds) {
    safeDispatchNotification(
      mId,
      userId,
      'CIRCLE_SESSION_SCHEDULED',
      'New Circle Group Session Scheduled',
      `"${title.trim()}" in ${circle.title} on ${scheduledDate.toLocaleDateString()} at ${time.slice(0, 5)}.`,
      `/circles/${circle._id}`
    );
  }

  return await session.populate('host', 'name email avatar');
};

/**
 * Retrieves upcoming and past group sessions for a circle.
 */
export const getCircleSessions = async (circleId, viewer = null) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, viewer);

  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    const { mockSessionsStore } = await import('./sessionService.js');
    const sessions = mockSessionsStore.filter(
      (s) => (s.circle?._id || s.circle)?.toString() === circleId.toString()
    );
    return {
      upcoming: sessions.filter((s) => s.status === 'SCHEDULED'),
      past: sessions.filter((s) => s.status !== 'SCHEDULED'),
    };
  }

  const [upcoming, past] = await Promise.all([
    Session.find({ circle: circleId, status: 'SCHEDULED' })
      .populate('host', 'name email avatar')
      .populate('rsvps.user', 'name email avatar')
      .sort({ date: 1 })
      .lean(),
    Session.find({ circle: circleId, status: { $ne: 'SCHEDULED' } })
      .populate('host', 'name email avatar')
      .populate('rsvps.user', 'name email avatar')
      .sort({ date: -1 })
      .limit(20)
      .lean(),
  ]);

  return { upcoming, past };
};

/**
 * RSVPs to a group session (GOING | NOT_GOING).
 */
export const rsvpGroupSession = async (sessionId, userId, status = 'GOING', reflection = '') => {
  const userIdStr = (userId?._id || userId).toString();

  let session;
  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    const { mockSessionsStore } = await import('./sessionService.js');
    session = mockSessionsStore.find((s) => s._id === sessionId || s._id?.toString() === sessionId?.toString());
  } else {
    session = await Session.findById(sessionId);
  }

  if (!session) {
    throw new ApiError(404, 'Group session not found');
  }

  if (!session.isGroupSession) {
    throw new ApiError(400, 'This endpoint is strictly for collaborative group sessions');
  }

  // Verify membership in the session's circle
  const { viewerPermissions } = await getCircleById(session.circle, userId);
  if (!viewerPermissions.isMember) {
    throw new ApiError(403, 'Forbidden: You must be a member of the circle to RSVP to this session');
  }

  session.rsvps = session.rsvps || [];
  const existingRsvpIndex = session.rsvps.findIndex(
    (r) => (r.user?._id || r.user).toString() === userIdStr
  );

  const goingCount = session.rsvps.filter((r) => r.status === 'GOING').length;

  if (status === 'GOING' && existingRsvpIndex === -1 && goingCount >= (session.maxParticipants || 50)) {
    throw new ApiError(400, 'Group session has reached maximum capacity');
  }

  if (existingRsvpIndex > -1) {
    session.rsvps[existingRsvpIndex].status = status;
    session.rsvps[existingRsvpIndex].rsvpAt = new Date();
    if (reflection) session.rsvps[existingRsvpIndex].reflection = reflection.trim();
  } else {
    session.rsvps.push({
      user: userId,
      status,
      rsvpAt: new Date(),
      reflection: reflection ? reflection.trim() : '',
    });
  }

  // Synchronize participants list
  const goingUsers = session.rsvps
    .filter((r) => r.status === 'GOING')
    .map((r) => r.user?._id || r.user);
  session.participants = goingUsers;

  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    return session;
  }

  await session.save();
  return session;
};

// =========================================================================
// COLLABORATIVE DISCUSSIONS & ANNOUNCEMENTS
// =========================================================================

/**
 * Retrieves paginated discussion posts and announcements for a circle.
 */
export const getCirclePosts = async (circleId, viewer = null, pagination = {}) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, viewer);

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const skip = (page - 1) * limit;

  if (process.env.MOCK_DB === 'true' && CirclePost.db?.readyState !== 1) {
    const circlePosts = mockCirclePostsStore
      .filter((p) => p.circle.toString() === circleId.toString())
      .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt));

    const total = circlePosts.length;
    return {
      posts: circlePosts.slice(skip, skip + limit),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  const [posts, total] = await Promise.all([
    CirclePost.find({ circle: circleId })
      .populate('author', 'name email avatar reputation')
      .populate('replies.author', 'name email avatar')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CirclePost.countDocuments({ circle: circleId }),
  ]);

  return {
    posts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Creates a discussion post or pinned announcement.
 */
export const createCirclePost = async (circleId, userId, postData) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isMember) {
    throw new ApiError(403, 'Forbidden: You must be a member of this circle to post discussions');
  }

  const { title, content, isAnnouncement = false, isPinned = false, tags = [] } = postData || {};

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Post title is required');
  }
  if (!content || !content.trim()) {
    throw new ApiError(400, 'Post content is required');
  }

  // Only owners and moderators can post announcements or pin posts
  const canAnnounce = viewerPermissions.isModerator;
  const finalAnnouncement = canAnnounce ? Boolean(isAnnouncement) : false;
  const finalPinned = canAnnounce ? Boolean(isPinned) : false;

  const postPayload = {
    circle: circleId,
    author: userId,
    title: title.trim(),
    content: content.trim(),
    isAnnouncement: finalAnnouncement,
    isPinned: finalPinned,
    replies: [],
    tags: Array.isArray(tags) ? tags : [],
  };

  if (process.env.MOCK_DB === 'true' && CirclePost.db?.readyState !== 1) {
    const mockPost = {
      _id: 'mock_post_' + Date.now(),
      ...postPayload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCirclePostsStore.push(mockPost);
    return mockPost;
  }

  const post = await CirclePost.create(postPayload);

  // If announcement, notify circle members
  if (finalAnnouncement) {
    const memberIds = circle.members
      .map((m) => (m.user?._id || m.user).toString())
      .filter((id) => id !== (userId?._id || userId).toString());

    for (const mId of memberIds) {
      safeDispatchNotification(
        mId,
        userId,
        'CIRCLE_ANNOUNCEMENT',
        `Announcement: ${circle.title}`,
        title.trim(),
        `/circles/${circle._id}`
      );
    }
  }

  return await post.populate('author', 'name email avatar reputation');
};

/**
 * Adds a reply to a discussion thread.
 */
export const addPostReply = async (circleId, postId, userId, replyContent) => {
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  if (!viewerPermissions.isMember) {
    throw new ApiError(403, 'Forbidden: You must be a circle member to reply to discussions');
  }

  if (!replyContent || !replyContent.trim()) {
    throw new ApiError(400, 'Reply content cannot be empty');
  }

  let post;
  if (process.env.MOCK_DB === 'true' && CirclePost.db?.readyState !== 1) {
    post = mockCirclePostsStore.find((p) => p._id === postId || p._id?.toString() === postId?.toString());
  } else {
    post = await CirclePost.findOne({ _id: postId, circle: circleId });
  }

  if (!post) {
    throw new ApiError(404, 'Discussion post not found');
  }

  const newReply = {
    _id: new mongoose.Types.ObjectId(),
    author: userId,
    content: replyContent.trim(),
    createdAt: new Date(),
  };

  post.replies.push(newReply);

  if (process.env.MOCK_DB === 'true' && CirclePost.db?.readyState !== 1) {
    return newReply;
  }

  await post.save();
  return newReply;
};

/**
 * Deletes a discussion post (Author, Moderator, or Owner).
 */
export const deleteCirclePost = async (circleId, postId, userId) => {
  const userIdStr = (userId?._id || userId).toString();
  const { circle, viewerPermissions } = await getCircleById(circleId, userId);

  let post;
  if (process.env.MOCK_DB === 'true' && CirclePost.db?.readyState !== 1) {
    const idx = mockCirclePostsStore.findIndex((p) => p._id === postId || p._id?.toString() === postId?.toString());
    if (idx === -1) throw new ApiError(404, 'Post not found');
    post = mockCirclePostsStore[idx];

    const isAuthor = post.author.toString() === userIdStr;
    if (!isAuthor && !viewerPermissions.isModerator) {
      throw new ApiError(403, 'Forbidden: You do not have permission to delete this post');
    }

    mockCirclePostsStore.splice(idx, 1);
    return { success: true };
  }

  post = await CirclePost.findOne({ _id: postId, circle: circleId });
  if (!post) {
    throw new ApiError(404, 'Discussion post not found');
  }

  const isAuthor = post.author.toString() === userIdStr;
  if (!isAuthor && !viewerPermissions.isModerator) {
    throw new ApiError(403, 'Forbidden: You do not have permission to delete this post');
  }

  await CirclePost.findByIdAndDelete(postId);
  return { success: true };
};

export default {
  getCircles,
  getCircleById,
  createCircle,
  updateCircle,
  joinCircle,
  leaveCircle,
  manageJoinRequest,
  updateMemberRole,
  removeMember,
  closeCircle,
  addCircleMilestone,
  updateCircleMilestone,
  addMilestoneTask,
  toggleMilestoneTask,
  proposeGroupSession,
  getCircleSessions,
  rsvpGroupSession,
  getCirclePosts,
  createCirclePost,
  addPostReply,
  deleteCirclePost,
};
