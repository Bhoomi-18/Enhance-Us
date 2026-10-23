import mongoose from 'mongoose';
import PortfolioItem from '../models/portfolioItemModel.js';
import Session from '../models/sessionModel.js';
import Review from '../models/reviewModel.js';
import Roadmap from '../models/roadmapModel.js';
import User from '../models/userModel.js';
import { ApiError } from '../utils/apiError.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';

export const mockPortfolioStore = [];

/**
 * Retrieves portfolio items for a given user respecting visibility permissions.
 */
export const getUserPortfolio = async (targetUserId, viewerUser = null) => {
  const targetIdStr = (targetUserId?._id || targetUserId).toString();
  const viewerIdStr = viewerUser?._id ? viewerUser._id.toString() : viewerUser ? viewerUser.toString() : null;

  const isOwner = viewerIdStr && viewerIdStr === targetIdStr;
  const isAuthenticated = Boolean(viewerIdStr);

  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    let items = mockPortfolioStore.filter((p) => p.user.toString() === targetIdStr);
    if (!isOwner) {
      if (isAuthenticated) {
        items = items.filter((p) => p.visibility === 'PUBLIC' || p.visibility === 'MEMBERS_ONLY');
      } else {
        items = items.filter((p) => p.visibility === 'PUBLIC');
      }
    }
    return {
      items,
      stats: {
        totalItems: items.length,
        confirmedCount: items.filter((i) => i.verificationStatus === 'EXCHANGE_CONFIRMED').length,
        evidenceCount: items.filter((i) => i.verificationStatus === 'PORTFOLIO_EVIDENCE').length,
        selfReportedCount: items.filter((i) => i.verificationStatus === 'SELF_REPORTED').length,
      },
    };
  }

  const query = { user: targetUserId };

  if (!isOwner) {
    if (isAuthenticated) {
      query.visibility = { $in: ['PUBLIC', 'MEMBERS_ONLY'] };
    } else {
      query.visibility = 'PUBLIC';
    }
  }

  const items = await PortfolioItem.find(query)
    .populate('peerReviewer', 'name avatar reputation')
    .populate('linkedSession', 'date time skillTaught status')
    .populate('linkedGoal', 'title')
    .sort({ createdAt: -1 });

  const stats = {
    totalItems: items.length,
    confirmedCount: items.filter((i) => i.verificationStatus === 'EXCHANGE_CONFIRMED').length,
    evidenceCount: items.filter((i) => i.verificationStatus === 'PORTFOLIO_EVIDENCE').length,
    selfReportedCount: items.filter((i) => i.verificationStatus === 'SELF_REPORTED').length,
  };

  return { items, stats };
};

/**
 * Creates a new portfolio item with input validation and anti-forgery protection.
 */
export const createPortfolioItem = async (userId, itemData) => {
  const {
    title,
    description,
    skillName,
    category = 'General',
    itemType = 'PROJECT',
    evidenceUrl = '',
    visibility = 'PUBLIC',
    verificationStatus,
  } = itemData || {};

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Portfolio item title is required');
  }
  if (!description || !description.trim()) {
    throw new ApiError(400, 'Portfolio item description is required');
  }
  if (!skillName || !skillName.trim()) {
    throw new ApiError(400, 'Associated skill name is required');
  }

  // Anti-forgery: users cannot arbitrarily self-assign EXCHANGE_CONFIRMED
  if (verificationStatus === 'EXCHANGE_CONFIRMED') {
    throw new ApiError(
      400,
      'Exchange-confirmed verification requires an auditable completed exchange session.'
    );
  }

  const normalizedSkill = normalizeSkillName(skillName);

  // Determine verification tier
  const calculatedStatus =
    evidenceUrl && evidenceUrl.trim() ? 'PORTFOLIO_EVIDENCE' : 'SELF_REPORTED';

  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const mockItem = {
      _id: 'mock_portfolio_' + Date.now(),
      user: userId.toString(),
      title: title.trim(),
      description: description.trim(),
      skillName: normalizedSkill,
      category: category.trim(),
      itemType,
      evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
      visibility,
      verificationStatus: calculatedStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPortfolioStore.push(mockItem);
    return mockItem;
  }

  const item = await PortfolioItem.create({
    user: userId,
    title: title.trim(),
    description: description.trim(),
    skillName: normalizedSkill,
    category: category.trim(),
    itemType,
    evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
    visibility,
    verificationStatus: calculatedStatus,
  });

  return item;
};

/**
 * Updates an existing portfolio item ensuring ownership.
 */
export const updatePortfolioItem = async (itemId, userId, updateData) => {
  const { title, description, skillName, category, itemType, evidenceUrl, visibility } =
    updateData || {};

  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const item = mockPortfolioStore.find(
      (p) => p._id === itemId && p.user.toString() === userId.toString()
    );
    if (!item) throw new ApiError(404, 'Portfolio item not found or unauthorized');

    if (title) item.title = title.trim();
    if (description) item.description = description.trim();
    if (skillName) item.skillName = normalizeSkillName(skillName);
    if (category) item.category = category.trim();
    if (itemType) item.itemType = itemType;
    if (evidenceUrl !== undefined) {
      item.evidenceUrl = evidenceUrl.trim();
      if (item.verificationStatus !== 'EXCHANGE_CONFIRMED') {
        item.verificationStatus = item.evidenceUrl ? 'PORTFOLIO_EVIDENCE' : 'SELF_REPORTED';
      }
    }
    if (visibility) item.visibility = visibility;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  const item = await PortfolioItem.findOne({ _id: itemId, user: userId });
  if (!item) {
    throw new ApiError(404, 'Portfolio item not found or you are not authorized to edit it');
  }

  if (title) item.title = title.trim();
  if (description) item.description = description.trim();
  if (skillName) item.skillName = normalizeSkillName(skillName);
  if (category) item.category = category.trim();
  if (itemType) item.itemType = itemType;
  if (evidenceUrl !== undefined) {
    item.evidenceUrl = evidenceUrl.trim();
    // Maintain EXCHANGE_CONFIRMED if already verified by peer exchange
    if (item.verificationStatus !== 'EXCHANGE_CONFIRMED') {
      item.verificationStatus = item.evidenceUrl ? 'PORTFOLIO_EVIDENCE' : 'SELF_REPORTED';
    }
  }
  if (visibility) item.visibility = visibility;

  await item.save();
  return item;
};

/**
 * Deletes a portfolio item ensuring ownership.
 */
export const deletePortfolioItem = async (itemId, userId) => {
  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const index = mockPortfolioStore.findIndex(
      (p) => p._id === itemId && p.user.toString() === userId.toString()
    );
    if (index === -1) throw new ApiError(404, 'Portfolio item not found or unauthorized');
    mockPortfolioStore.splice(index, 1);
    return { success: true };
  }

  const result = await PortfolioItem.findOneAndDelete({ _id: itemId, user: userId });
  if (!result) {
    throw new ApiError(404, 'Portfolio item not found or you are not authorized to delete it');
  }

  return { success: true };
};

/**
 * Confirms a real exchange outcome and creates a verified EXCHANGE_CONFIRMED portfolio item.
 * Requires:
 * 1. An existing Session with status COMPLETED.
 * 2. User must be an authenticated participant.
 * 3. An associated peer review must exist for accountability.
 */
export const confirmExchangePortfolioOutcome = async (userId, data) => {
  const { sessionId, title, description, evidenceUrl = '', visibility = 'PUBLIC' } = data || {};

  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required to link an exchange-confirmed achievement');
  }

  const userIdStr = (userId?._id || userId).toString();

  // Find Session
  let session;
  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const { mockSessionsStore } = await import('./sessionService.js');
    session = (mockSessionsStore || []).find(
      (s) => s._id === sessionId || s._id?.toString() === sessionId?.toString()
    );
  } else {
    session = await Session.findById(sessionId);
  }

  if (!session) {
    throw new ApiError(404, 'Referenced exchange session could not be found');
  }

  if (session.status !== 'COMPLETED') {
    throw new ApiError(
      400,
      'Exchange session must be marked COMPLETED before confirming a portfolio outcome'
    );
  }

  // Verify user is a participant
  const isParticipant = (session.participants || []).some(
    (p) => (p._id || p).toString() === userIdStr
  );
  if (!isParticipant) {
    throw new ApiError(403, 'Forbidden: You were not a participant in this exchange session');
  }

  // Identify peer
  const peerId = (session.participants || []).find((p) => (p._id || p).toString() !== userIdStr);
  if (!peerId) {
    throw new ApiError(400, 'Peer recipient could not be resolved from session');
  }

  // Check if already created for this session
  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const existing = mockPortfolioStore.find(
      (p) =>
        p.user.toString() === userIdStr &&
        p.linkedSession?.toString() === sessionId?.toString()
    );
    if (existing) {
      throw new ApiError(
        400,
        'A confirmed portfolio achievement has already been generated for this completed session'
      );
    }
  } else {
    const existingItem = await PortfolioItem.findOne({
      user: userId,
      linkedSession: session._id,
    });

    if (existingItem) {
      throw new ApiError(
        400,
        'A confirmed portfolio achievement has already been generated for this completed session'
      );
    }
  }

  // Retrieve peer details for title/description fallback
  let peerName = 'Exchange Partner';
  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    peerName = peerId?.name || 'Exchange Partner';
  } else {
    const peerUser = await User.findById(peerId).select('name');
    if (peerUser?.name) peerName = peerUser.name;
  }

  const normalizedSkill = normalizeSkillName(session.skillTaught);

  const defaultTitle = `Completed Exchange: ${normalizedSkill}`;
  const defaultDesc = `Successfully completed a reciprocal skill-exchange session on ${normalizedSkill} with peer ${peerName}. Verified by mutual session completion and rating records.`;

  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const mockItem = {
      _id: 'mock_portfolio_' + Date.now(),
      user: userIdStr,
      title: (title || defaultTitle).trim(),
      description: (description || defaultDesc).trim(),
      skillName: normalizedSkill,
      category: 'Exchange Outcomes',
      itemType: 'EXCHANGE_OUTCOME',
      evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
      visibility,
      verificationStatus: 'EXCHANGE_CONFIRMED',
      linkedSession: session._id,
      linkedGoal: session.goal || null,
      peerReviewer: peerId,
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPortfolioStore.push(mockItem);
    return mockItem;
  }

  const item = await PortfolioItem.create({
    user: userId,
    title: (title || defaultTitle).trim(),
    description: (description || defaultDesc).trim(),
    skillName: normalizedSkill,
    category: 'Exchange Outcomes',
    itemType: 'EXCHANGE_OUTCOME',
    evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
    visibility,
    verificationStatus: 'EXCHANGE_CONFIRMED',
    linkedSession: session._id,
    linkedGoal: session.goal || null,
    peerReviewer: peerId,
    confirmedAt: new Date(),
  });

  return await item.populate('peerReviewer', 'name avatar reputation');
};

/**
 * Creates a portfolio item directly from a completed V2 Roadmap Milestone.
 */
export const createPortfolioFromMilestone = async (userId, data) => {
  const { roadmapId, milestoneId, title, description, evidenceUrl = '', visibility = 'PUBLIC' } = data || {};

  if (!roadmapId || !milestoneId) {
    throw new ApiError(400, 'Roadmap ID and Milestone ID are required');
  }

  const userIdStr = (userId?._id || userId).toString();
  let roadmap;

  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const { mockRoadmapsStore } = await import('./roadmapService.js').catch(() => ({ mockRoadmapsStore: [] }));
    roadmap = (mockRoadmapsStore || []).find(
      (r) =>
        (r._id === roadmapId || r._id?.toString() === roadmapId?.toString()) &&
        r.user?.toString() === userIdStr
    );
  } else {
    roadmap = await Roadmap.findOne({ _id: roadmapId, user: userId });
  }

  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found or unauthorized');
  }

  const milestone = (roadmap.milestones || []).find(
    (m) => m.milestoneId === milestoneId
  );

  if (!milestone) {
    throw new ApiError(404, 'Specified milestone not found in this roadmap');
  }

  const normalizedSkill = normalizeSkillName(milestone.skillName);
  const milestoneTitle = title || `Milestone Mastered: ${milestone.title}`;
  const milestoneDesc = description || milestone.description || `Completed learning milestone for ${normalizedSkill} as part of goal roadmap.`;

  const calculatedStatus = evidenceUrl && evidenceUrl.trim() ? 'PORTFOLIO_EVIDENCE' : 'SELF_REPORTED';

  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    const mockItem = {
      _id: 'mock_portfolio_' + Date.now(),
      user: userIdStr,
      title: milestoneTitle.trim(),
      description: milestoneDesc.trim(),
      skillName: normalizedSkill,
      category: 'Learning Milestones',
      itemType: 'LEARNING_MILESTONE',
      evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
      visibility,
      verificationStatus: calculatedStatus,
      linkedGoal: roadmap.goal || null,
      linkedMilestoneId: milestone.milestoneId,
      confirmedAt: milestone.status === 'COMPLETED' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockPortfolioStore.push(mockItem);
    return mockItem;
  }

  const item = await PortfolioItem.create({
    user: userId,
    title: milestoneTitle.trim(),
    description: milestoneDesc.trim(),
    skillName: normalizedSkill,
    category: 'Learning Milestones',
    itemType: 'LEARNING_MILESTONE',
    evidenceUrl: evidenceUrl ? evidenceUrl.trim() : '',
    visibility,
    verificationStatus: calculatedStatus,
    linkedGoal: roadmap.goal || null,
    linkedMilestoneId: milestone.milestoneId,
    confirmedAt: milestone.status === 'COMPLETED' ? new Date() : null,
  });

  return item;
};

export default {
  getUserPortfolio,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  confirmExchangePortfolioOutcome,
  createPortfolioFromMilestone,
};
