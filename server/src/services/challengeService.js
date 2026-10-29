import mongoose from 'mongoose';
import Challenge from '../models/challengeModel.js';
import ChallengeParticipation from '../models/challengeParticipationModel.js';
import ChallengeUpdate from '../models/challengeUpdateModel.js';
import Workspace from '../models/workspaceModel.js';
import User from '../models/userModel.js';
import { createFilteredNotification } from './notificationService.js';
import { ApiError } from '../utils/apiError.js';
import { checkAndAwardAchievement } from './achievementService.js';
import { validateHttpUrl } from './skillEvidenceService.js';
import { recordEvent } from './analyticsService.js';

/**
 * Derives current lifecycle status from dates and stored state.
 */
export const deriveChallengeStatus = (challenge) => {
  if (challenge.status === 'CANCELLED' || challenge.status === 'DRAFT') {
    return challenge.status;
  }
  const now = new Date();
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);

  if (now < start) return 'UPCOMING';
  if (now >= start && now <= end) return 'ACTIVE';
  return 'COMPLETED';
};

/**
 * Creates a new community challenge.
 */
export const createChallenge = async (userId, challengeData) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const {
    title,
    description,
    associatedSkill,
    associatedGoalTitle,
    startDate,
    endDate,
    participationType,
    visibility,
    capacity,
    milestones,
    rules,
  } = challengeData || {};

  const cleanTitle = (title || '').trim();
  if (cleanTitle.length < 3) throw new ApiError(400, 'Challenge title must be at least 3 characters');
  if (cleanTitle.length > 120) throw new ApiError(400, 'Challenge title cannot exceed 120 characters');

  const cleanDesc = (description || '').trim();
  if (cleanDesc.length < 10) throw new ApiError(400, 'Challenge description must be at least 10 characters');
  if (cleanDesc.length > 2000) throw new ApiError(400, 'Challenge description cannot exceed 2000 characters');

  const cleanSkill = (associatedSkill || '').trim();
  if (!cleanSkill) throw new ApiError(400, 'Associated skill or learning domain is required');

  if (!startDate || !endDate) {
    throw new ApiError(400, 'Both start date and end date are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, 'Invalid date format provided for challenge schedule');
  }

  if (start >= end) {
    throw new ApiError(400, 'End date must be strictly after the start date');
  }

  // Format milestones
  const cleanMilestones = (Array.isArray(milestones) ? milestones : [])
    .map((m, idx) => {
      const mTitle = (m.title || '').trim();
      if (!mTitle) return null;
      return {
        title: mTitle.slice(0, 150),
        description: (m.description || '').trim().slice(0, 500),
        criteria: (m.criteria || '').trim().slice(0, 300),
        order: idx,
      };
    })
    .filter(Boolean);

  let cleanCapacity = null;
  if (capacity !== undefined && capacity !== null && capacity !== '') {
    const parsedCap = parseInt(capacity, 10);
    if (isNaN(parsedCap) || parsedCap < 1 || parsedCap > 1000) {
      throw new ApiError(400, 'Capacity must be a number between 1 and 1000 participants');
    }
    cleanCapacity = parsedCap;
  }

  const partType = participationType === 'TEAM' ? 'TEAM' : 'INDIVIDUAL';
  const vis = visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';

  // Compute initial lifecycle status
  const now = new Date();
  let initialStatus = 'ACTIVE';
  if (now < start) initialStatus = 'UPCOMING';
  else if (now > end) initialStatus = 'COMPLETED';

  const challenge = await Challenge.create({
    title: cleanTitle,
    description: cleanDesc,
    associatedSkill: cleanSkill,
    associatedGoalTitle: (associatedGoalTitle || '').trim().slice(0, 150),
    creator: userId,
    startDate: start,
    endDate: end,
    participationType: partType,
    visibility: vis,
    capacity: cleanCapacity,
    status: initialStatus,
    milestones: cleanMilestones,
    rules: Array.isArray(rules) ? rules.map((r) => String(r).trim()).filter(Boolean) : [],
  });

  return await Challenge.findById(challenge._id).populate('creator', 'name email avatar');
};

/**
 * Returns public or discoverable community challenges with filters.
 */
export const getChallenges = async (userId = null, query = {}) => {
  const { skill, status, type, search } = query;
  const filter = { isArchived: false };

  // Visibility: unauthenticated or non-admin users only see PUBLIC
  filter.visibility = 'PUBLIC';

  if (status && ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
    filter.status = status.toUpperCase();
  }

  if (type && ['INDIVIDUAL', 'TEAM'].includes(type.toUpperCase())) {
    filter.participationType = type.toUpperCase();
  }

  if (skill && skill.trim()) {
    filter.associatedSkill = new RegExp(skill.trim(), 'i');
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { title: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { associatedSkill: new RegExp(q, 'i') },
    ];
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const challenges = await Challenge.find(filter)
    .populate('creator', 'name avatar')
    .sort({ startDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const challengeIds = challenges.map((ch) => ch._id);

  // Batch aggregate participant counts (O(1) database query instead of O(N))
  const counts = challengeIds.length > 0
    ? await ChallengeParticipation.aggregate([
        { $match: { challenge: { $in: challengeIds }, status: { $ne: 'ABANDONED' } } },
        { $group: { _id: '$challenge', count: { $sum: 1 } } },
      ])
    : [];
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

  // Batch query user participations (O(1) database query instead of O(N))
  const userPartMap = new Map();
  if (userId && challengeIds.length > 0) {
    const userParts = await ChallengeParticipation.find({
      challenge: { $in: challengeIds },
      user: userId,
      status: { $ne: 'ABANDONED' },
    }).lean();
    userParts.forEach((up) => userPartMap.set(up.challenge.toString(), up));
  }

  // Enhance each challenge with dynamic participation stats synchronously
  const enhanced = challenges.map((ch) => {
    const derivedStatus = deriveChallengeStatus(ch);
    const participantCount = countMap.get(ch._id.toString()) || 0;
    const userPart = userPartMap.get(ch._id.toString());
    const isJoined = Boolean(userPart);
    const userProgress = userPart?.progress || 0;

    return {
      ...ch,
      status: derivedStatus,
      participantCount,
      isJoined,
      userProgress,
    };
  });

  return enhanced;
};

/**
 * Returns challenges joined or created by the authenticated user.
 */
export const getUserChallenges = async (userId) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const participations = await ChallengeParticipation.find({
    user: userId,
    status: { $ne: 'ABANDONED' },
  })
    .populate({
      path: 'challenge',
      populate: { path: 'creator', select: 'name email avatar' },
    })
    .populate('teamWorkspace', 'title visibility members')
    .sort({ joinedAt: -1 })
    .lean();

  const createdChallenges = await Challenge.find({
    creator: userId,
    isArchived: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    joinedChallenges: participations.map((p) => ({
      ...p.challenge,
      participationId: p._id,
      participationStatus: p.status,
      participationType: p.participationType,
      teamWorkspace: p.teamWorkspace,
      progress: p.progress,
      completedMilestonesCount: (p.completedMilestones || []).length,
      joinedAt: p.joinedAt,
    })),
    createdChallenges,
  };
};

/**
 * Retrieves a single challenge by ID with participation details.
 */
export const getChallengeById = async (challengeId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(challengeId)) {
    throw new ApiError(400, 'Invalid challenge ID');
  }

  const challenge = await Challenge.findById(challengeId)
    .populate('creator', 'name email avatar')
    .lean();

  if (!challenge || challenge.isArchived) {
    throw new ApiError(404, 'Challenge not found');
  }

  // Access check for private challenge
  if (challenge.visibility === 'PRIVATE') {
    if (!userId) {
      throw new ApiError(403, 'Access denied: This challenge is private');
    }
    const isCreator = challenge.creator._id.toString() === userId.toString();
    const isMember = await ChallengeParticipation.exists({
      challenge: challengeId,
      user: userId,
      status: { $ne: 'ABANDONED' },
    });

    if (!isCreator && !isMember) {
      throw new ApiError(403, 'Access denied: You are not an authorized participant in this private challenge');
    }
  }

  const derivedStatus = deriveChallengeStatus(challenge);
  const participantCount = await ChallengeParticipation.countDocuments({
    challenge: challengeId,
    status: { $ne: 'ABANDONED' },
  });

  let userParticipation = null;
  if (userId) {
    userParticipation = await ChallengeParticipation.findOne({
      challenge: challengeId,
      user: userId,
      status: { $ne: 'ABANDONED' },
    })
      .populate('teamWorkspace', 'title members visibility')
      .lean();
  }

  // If team challenge, retrieve participating workspaces summary
  let participatingTeams = [];
  if (challenge.participationType === 'TEAM') {
    participatingTeams = await ChallengeParticipation.find({
      challenge: challengeId,
      teamWorkspace: { $ne: null },
      status: { $ne: 'ABANDONED' },
    })
      .populate('teamWorkspace', 'title associatedSkill progress members')
      .populate('user', 'name avatar')
      .lean();
  }

  return {
    ...challenge,
    status: derivedStatus,
    participantCount,
    userParticipation,
    participatingTeams,
  };
};

/**
 * Updates a challenge (Creator or Admin only).
 */
export const updateChallenge = async (challengeId, userId, updateData, isAdmin = false) => {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge || challenge.isArchived) {
    throw new ApiError(404, 'Challenge not found');
  }

  const isCreator = challenge.creator.toString() === userId.toString();
  if (!isCreator && !isAdmin) {
    throw new ApiError(403, 'Permission denied: Only the challenge creator or an administrator can update this challenge');
  }

  if (challenge.status === 'CANCELLED') {
    throw new ApiError(400, 'Cancelled challenges cannot be edited');
  }

  const { title, description, associatedSkill, capacity, rules, milestones, visibility } = updateData || {};

  if (title !== undefined) {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) throw new ApiError(400, 'Title must be at least 3 characters');
    challenge.title = cleanTitle.slice(0, 120);
  }

  if (description !== undefined) {
    const cleanDesc = description.trim();
    if (cleanDesc.length < 10) throw new ApiError(400, 'Description must be at least 10 characters');
    challenge.description = cleanDesc.slice(0, 2000);
  }

  if (associatedSkill !== undefined) {
    challenge.associatedSkill = associatedSkill.trim().slice(0, 50);
  }

  if (capacity !== undefined) {
    if (capacity === null || capacity === '') {
      challenge.capacity = null;
    } else {
      const capNum = parseInt(capacity, 10);
      if (isNaN(capNum) || capNum < 1 || capNum > 1000) {
        throw new ApiError(400, 'Capacity must be between 1 and 1000');
      }
      challenge.capacity = capNum;
    }
  }

  if (rules !== undefined && Array.isArray(rules)) {
    challenge.rules = rules.map((r) => String(r).trim()).filter(Boolean);
  }

  if (visibility !== undefined && ['PUBLIC', 'PRIVATE'].includes(visibility)) {
    challenge.visibility = visibility;
  }

  if (Array.isArray(milestones)) {
    challenge.milestones = milestones
      .map((m, idx) => {
        const mTitle = (m.title || '').trim();
        if (!mTitle) return null;
        return {
          title: mTitle.slice(0, 150),
          description: (m.description || '').trim().slice(0, 500),
          criteria: (m.criteria || '').trim().slice(0, 300),
          order: idx,
        };
      })
      .filter(Boolean);
  }

  await challenge.save();
  return await Challenge.findById(challengeId).populate('creator', 'name email avatar');
};

/**
 * Cancels a challenge (Creator or Admin only).
 */
export const cancelChallenge = async (challengeId, userId, reason = '', isAdmin = false) => {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge || challenge.isArchived) {
    throw new ApiError(404, 'Challenge not found');
  }

  const isCreator = challenge.creator.toString() === userId.toString();
  if (!isCreator && !isAdmin) {
    throw new ApiError(403, 'Permission denied: Only the challenge creator or an administrator can cancel this challenge');
  }

  challenge.status = 'CANCELLED';
  await challenge.save();

  // Notify active participants
  const participants = await ChallengeParticipation.find({
    challenge: challengeId,
    status: { $ne: 'ABANDONED' },
  }).select('user');

  for (const part of participants) {
    if (part.user.toString() !== userId.toString()) {
      try {
        await createFilteredNotification({
          recipientId: part.user,
          senderId: userId,
          type: 'CHALLENGE_UPDATE',
          title: `Challenge Cancelled: ${challenge.title}`,
          message: reason ? `Reason: ${reason}` : 'The challenge creator or administrator has cancelled this challenge.',
          link: `/challenges/${challengeId}`,
        });
      } catch (err) {
        // ignore notification error
      }
    }
  }

  return { message: 'Challenge has been cancelled successfully', status: 'CANCELLED' };
};

/**
 * Joins a challenge as an individual learner or as a collaborative workspace team.
 */
export const joinChallenge = async (challengeId, userId, options = {}) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const challenge = await Challenge.findById(challengeId);
  if (!challenge || challenge.isArchived) {
    throw new ApiError(404, 'Challenge not found');
  }

  if (challenge.status === 'CANCELLED') {
    throw new ApiError(400, 'Cannot join a cancelled challenge');
  }

  const now = new Date();
  if (now > new Date(challenge.endDate)) {
    throw new ApiError(400, 'Cannot join an expired or completed challenge');
  }

  // Check capacity limit
  if (challenge.capacity) {
    const currentCount = await ChallengeParticipation.countDocuments({
      challenge: challengeId,
      status: { $ne: 'ABANDONED' },
    });
    if (currentCount >= challenge.capacity) {
      throw new ApiError(400, 'Challenge has reached maximum participant capacity');
    }
  }

  const { teamWorkspaceId } = options;

  // Handle Team Workspace Registration
  if (challenge.participationType === 'TEAM') {
    if (!teamWorkspaceId) {
      throw new ApiError(400, 'This challenge requires team participation. Please select a collaborative workspace.');
    }

    const workspace = await Workspace.findById(teamWorkspaceId);
    if (!workspace || workspace.isArchived) {
      throw new ApiError(404, 'Collaborative workspace not found');
    }

    const userIdStr = userId.toString();
    const isOwner = workspace.owner.toString() === userIdStr;
    const userMember = workspace.members.find((m) => m.user.toString() === userIdStr);

    if (!isOwner && userMember?.role !== 'ADMIN') {
      throw new ApiError(403, 'Permission denied: Only workspace owners or administrators can enroll a workspace into a team challenge');
    }

    // Check if workspace is already registered
    const existingTeam = await ChallengeParticipation.findOne({
      challenge: challengeId,
      teamWorkspace: teamWorkspaceId,
      status: { $ne: 'ABANDONED' },
    });
    if (existingTeam) {
      throw new ApiError(409, 'This workspace is already participating in this challenge');
    }

    // Create participation record for the workspace enrollment
    const participation = await ChallengeParticipation.create({
      challenge: challengeId,
      user: userId,
      teamWorkspace: teamWorkspaceId,
      participationType: 'TEAM',
      status: 'IN_PROGRESS',
      progress: 0,
      completedMilestones: [],
      joinedAt: new Date(),
    });

    // Award First Challenge Joined achievement
    await checkAndAwardAchievement(userId, 'FIRST_CHALLENGE_JOINED', { challengeId, title: challenge.title });

    return {
      message: 'Workspace successfully enrolled in team challenge',
      participation,
    };
  }

  // Handle Individual Registration
  const existing = await ChallengeParticipation.findOne({
    challenge: challengeId,
    user: userId,
  });

  if (existing) {
    if (existing.status !== 'ABANDONED') {
      throw new ApiError(409, 'You have already joined this challenge');
    }
    // Re-activate if previously abandoned
    existing.status = 'IN_PROGRESS';
    existing.joinedAt = new Date();
    await existing.save();

    await checkAndAwardAchievement(userId, 'FIRST_CHALLENGE_JOINED', { challengeId, title: challenge.title });
    return { message: 'Re-enrolled in challenge successfully', participation: existing };
  }

  const participation = await ChallengeParticipation.create({
    challenge: challengeId,
    user: userId,
    participationType: 'INDIVIDUAL',
    status: 'IN_PROGRESS',
    progress: 0,
    completedMilestones: [],
    joinedAt: new Date(),
  });

  // Award First Challenge Joined achievement
  await checkAndAwardAchievement(userId, 'FIRST_CHALLENGE_JOINED', { challengeId, title: challenge.title });

  recordEvent({
    eventType: 'challenge_joined',
    userId,
    metadata: {
      challengeId,
      participationType: participation.participationType,
      isDemo: Boolean(challenge.isDemo),
    },
  }).catch(() => {});

  return {
    message: 'Joined challenge successfully',
    participation,
  };
};

/**
 * Leaves a challenge.
 */
export const leaveChallenge = async (challengeId, userId) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const participation = await ChallengeParticipation.findOne({
    challenge: challengeId,
    user: userId,
    status: { $ne: 'ABANDONED' },
  });

  if (!participation) {
    throw new ApiError(404, 'You are not an active participant in this challenge');
  }

  participation.status = 'ABANDONED';
  await participation.save();

  return { message: 'You have left the challenge' };
};

/**
 * Marks a challenge milestone as completed for the participant or workspace.
 * Calculates verified progress percentage server-side.
 */
export const completeMilestone = async (challengeId, milestoneId, userId, note = '') => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const challenge = await Challenge.findById(challengeId);
  if (!challenge || challenge.isArchived) {
    throw new ApiError(404, 'Challenge not found');
  }

  if (challenge.status === 'CANCELLED') {
    throw new ApiError(400, 'Cannot complete milestones on a cancelled challenge');
  }

  const milestone = challenge.milestones.id(milestoneId);
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found in this challenge');
  }

  // Find participation record (either individual or workspace member)
  let participation = await ChallengeParticipation.findOne({
    challenge: challengeId,
    user: userId,
    status: { $ne: 'ABANDONED' },
  });

  // If not direct individual, check if user is a member of an enrolled team workspace
  if (!participation) {
    const userWorkspaces = await Workspace.find({
      'members.user': userId,
      isArchived: false,
    }).select('_id');
    const wsIds = userWorkspaces.map((w) => w._id);

    participation = await ChallengeParticipation.findOne({
      challenge: challengeId,
      teamWorkspace: { $in: wsIds },
      status: { $ne: 'ABANDONED' },
    });
  }

  if (!participation) {
    throw new ApiError(403, 'Permission denied: You must be an active participant or team member to complete milestones');
  }

  // Prevent duplicate milestone completion
  const alreadyCompleted = participation.completedMilestones.some(
    (m) => m.milestoneId.toString() === milestoneId.toString()
  );

  if (alreadyCompleted) {
    return {
      message: 'Milestone is already marked as completed',
      participation,
      progress: participation.progress,
    };
  }

  participation.completedMilestones.push({
    milestoneId,
    completedAt: new Date(),
    completedBy: userId,
    note: (note || '').trim().slice(0, 300),
  });

  // DERIVE PROGRESS STRICTLY ON SERVER
  const totalMilestones = challenge.milestones.length;
  const completedCount = participation.completedMilestones.length;
  participation.progress = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 100;

  let isChallengeCompleted = false;
  if (completedCount >= totalMilestones) {
    participation.status = 'COMPLETED';
    participation.completedAt = new Date();
    isChallengeCompleted = true;
  } else {
    participation.status = 'IN_PROGRESS';
  }

  await participation.save();

  // Award Achievements
  // 1. Milestone Crusher
  await checkAndAwardAchievement(userId, 'FIRST_CHALLENGE_MILESTONE', {
    challengeId,
    milestoneId,
    title: milestone.title,
  });

  // 2. Challenge Victor (if all milestones completed)
  if (isChallengeCompleted) {
    await checkAndAwardAchievement(userId, 'FIRST_CHALLENGE_COMPLETED', {
      challengeId,
      title: challenge.title,
    });

    if (participation.participationType === 'TEAM') {
      await checkAndAwardAchievement(userId, 'FIRST_TEAM_CHALLENGE_COMPLETED', {
        challengeId,
        teamWorkspace: participation.teamWorkspace,
        title: challenge.title,
      });
    }

    recordEvent({
      eventType: 'challenge_completed',
      userId,
      metadata: {
        challengeId,
        participationType: participation.participationType,
        isDemo: Boolean(challenge.isDemo),
      },
    }).catch(() => {});
  }

  return {
    message: isChallengeCompleted ? '🎉 Congratulations! Challenge completed!' : 'Milestone marked as complete',
    participation,
    progress: participation.progress,
    isCompleted: isChallengeCompleted,
  };
};

/**
 * Reverts or undoes milestone completion for authorized participants.
 */
export const undoMilestone = async (challengeId, milestoneId, userId) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) throw new ApiError(404, 'Challenge not found');

  let participation = await ChallengeParticipation.findOne({
    challenge: challengeId,
    user: userId,
    status: { $ne: 'ABANDONED' },
  });

  if (!participation) {
    const userWorkspaces = await Workspace.find({
      'members.user': userId,
      isArchived: false,
    }).select('_id');
    participation = await ChallengeParticipation.findOne({
      challenge: challengeId,
      teamWorkspace: { $in: userWorkspaces.map((w) => w._id) },
      status: { $ne: 'ABANDONED' },
    });
  }

  if (!participation) {
    throw new ApiError(403, 'Permission denied to modify milestone progress');
  }

  participation.completedMilestones = participation.completedMilestones.filter(
    (m) => m.milestoneId.toString() !== milestoneId.toString()
  );

  const totalMilestones = challenge.milestones.length;
  const completedCount = participation.completedMilestones.length;
  participation.progress = totalMilestones > 0 ? Math.round((completedCount / totalMilestones) * 100) : 0;
  participation.status = 'IN_PROGRESS';
  participation.completedAt = null;

  await participation.save();

  return {
    message: 'Milestone progress reverted',
    participation,
    progress: participation.progress,
  };
};

/**
 * Posts a progress update to the challenge community feed.
 */
export const createChallengeUpdate = async (challengeId, userId, updateData) => {
  if (!userId) throw new ApiError(401, 'Authentication required');

  const challenge = await Challenge.findById(challengeId);
  if (!challenge || challenge.isArchived) {
    throw new ApiError(404, 'Challenge not found');
  }

  const { content, milestone, evidenceUrl, teamWorkspaceId } = updateData || {};
  const cleanContent = (content || '').trim();
  if (!cleanContent) {
    throw new ApiError(400, 'Update message cannot be empty');
  }
  if (cleanContent.length > 1000) {
    throw new ApiError(400, 'Update message cannot exceed 1000 characters');
  }

  let validEvidence = '';
  if (evidenceUrl) {
    validEvidence = validateHttpUrl(evidenceUrl, 'Evidence link');
  }

  const update = await ChallengeUpdate.create({
    challenge: challengeId,
    user: userId,
    teamWorkspace: teamWorkspaceId || null,
    content: cleanContent,
    milestone: milestone && mongoose.Types.ObjectId.isValid(milestone) ? milestone : null,
    evidenceUrl: validEvidence,
  });

  return await ChallengeUpdate.findById(update._id).populate('user', 'name avatar');
};

/**
 * Retrieves paginated updates for a challenge.
 */
export const getChallengeUpdates = async (challengeId, pagination = {}) => {
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 20));

  const total = await ChallengeUpdate.countDocuments({ challenge: challengeId });
  const updates = await ChallengeUpdate.find({ challenge: challengeId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    updates,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Deletes a challenge update (Author or Admin only).
 */
export const deleteChallengeUpdate = async (challengeId, updateId, userId, isAdmin = false) => {
  const update = await ChallengeUpdate.findOne({ _id: updateId, challenge: challengeId });
  if (!update) throw new ApiError(404, 'Update not found');

  const isAuthor = update.user.toString() === userId.toString();
  if (!isAuthor && !isAdmin) {
    throw new ApiError(403, 'Permission denied: Only the author or an administrator can delete this update');
  }

  await ChallengeUpdate.deleteOne({ _id: updateId });
  return { message: 'Update removed successfully' };
};

export default {
  createChallenge,
  getChallenges,
  getUserChallenges,
  getChallengeById,
  updateChallenge,
  cancelChallenge,
  joinChallenge,
  leaveChallenge,
  completeMilestone,
  undoMilestone,
  createChallengeUpdate,
  getChallengeUpdates,
  deleteChallengeUpdate,
  deriveChallengeStatus,
};
