import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';
import Goal from '../models/goalModel.js';
import Feedback from '../models/feedbackModel.js';
import Review from '../models/reviewModel.js';
import { recordAuditLog } from './auditService.js';
import { DEMO_EMAIL } from './authService.js';
import { isAdminEmail } from '../utils/adminAuth.js';
import { ApiError } from '../utils/apiError.js';
import { getSystemHealthSnapshot } from './performanceTracker.js';

/**
 * Filter ensuring real production analytics exclude the dedicated demo identity
 */
const realUserFilter = {
  isDemo: { $ne: true },
  email: { $ne: DEMO_EMAIL },
};

/**
 * Calculates profile completion percentage based on filled profile attributes
 */
export const calculateProfileCompletion = (user) => {
  if (!user) return 0;
  const fields = [
    Boolean(user.name),
    Boolean(user.email),
    Boolean(user.bio && user.bio.trim().length > 10),
    Boolean(user.avatar),
    Boolean(user.skills && user.skills.length > 0),
    Boolean(user.learningInterests && user.learningInterests.length > 0),
    Boolean(user.availability),
    Boolean(user.experienceLevel),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

/**
 * Computes high-level overview metrics across the platform
 */
export const getAdminOverviewMetrics = async () => {
  const isMongoConnected = User.db?.readyState === 1;

  if (!isMongoConnected) {
    const health = await getSystemHealthSnapshot();
    return {
      users: { totalRealUsers: 0, verifiedCount: 0, unverifiedCount: 0, active24h: 0, active7d: 0, active30d: 0 },
      sessions: { total: 0, scheduled: 0, completed: 0, cancelled: 0 },
      feedback: { total: 0, unresolved: 0, averageRating: 0, emailDeliveredCount: 0, emailPendingCount: 0 },
      health,
    };
  }

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalRealUsers,
    verifiedCount,
    unverifiedCount,
    newRegistrations7d,
    newRegistrations30d,
    active24h,
    active7d,
    active30d,
    sessionStats,
    feedbackStats,
    health,
  ] = await Promise.all([
    // Real Users
    User.countDocuments(realUserFilter),
    User.countDocuments({ ...realUserFilter, emailVerified: true }),
    User.countDocuments({ ...realUserFilter, emailVerified: false }),
    User.countDocuments({ ...realUserFilter, createdAt: { $gte: weekAgo } }),
    User.countDocuments({ ...realUserFilter, createdAt: { $gte: monthAgo } }),
    // Active Users (based on lastActiveAt or updatedAt)
    User.countDocuments({ ...realUserFilter, $or: [{ lastActiveAt: { $gte: dayAgo } }, { updatedAt: { $gte: dayAgo } }] }),
    User.countDocuments({ ...realUserFilter, $or: [{ lastActiveAt: { $gte: weekAgo } }, { updatedAt: { $gte: weekAgo } }] }),
    User.countDocuments({ ...realUserFilter, $or: [{ lastActiveAt: { $gte: monthAgo } }, { updatedAt: { $gte: monthAgo } }] }),
    // Sessions
    Session.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    // Feedback
    Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          unresolved: {
            $sum: { $cond: [{ $in: ['$status', ['NEW', 'IN_PROGRESS']] }, 1, 0] },
          },
          emailDelivered: {
            $sum: { $cond: [{ $eq: ['$emailDelivered', true] }, 1, 0] },
          },
          emailPending: {
            $sum: { $cond: [{ $eq: ['$emailDelivered', false] }, 1, 0] },
          },
        },
      },
    ]),
    getSystemHealthSnapshot(),
  ]);

  // Map session status counts
  const sessionStatusMap = {
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    missed: 0,
  };
  sessionStats.forEach((s) => {
    sessionStatusMap.total += s.count;
    if (s._id === 'SCHEDULED') sessionStatusMap.scheduled = s.count;
    else if (s._id === 'IN_PROGRESS') sessionStatusMap.inProgress = s.count;
    else if (s._id === 'COMPLETED') sessionStatusMap.completed = s.count;
    else if (s._id === 'CANCELLED') sessionStatusMap.cancelled = s.count;
    else if (s._id === 'MISSED') sessionStatusMap.missed = s.count;
  });

  const fbAggregate = feedbackStats[0] || {
    total: 0,
    avgRating: 0,
    unresolved: 0,
    emailDelivered: 0,
    emailPending: 0,
  };

  return {
    users: {
      totalRealUsers,
      verifiedCount,
      unverifiedCount,
      newRegistrations7d,
      newRegistrations30d,
      active24h,
      active7d,
      active30d,
    },
    sessions: sessionStatusMap,
    feedback: {
      total: fbAggregate.total,
      unresolved: fbAggregate.unresolved,
      averageRating: Math.round((fbAggregate.avgRating || 0) * 10) / 10,
      emailDeliveredCount: fbAggregate.emailDelivered,
      emailPendingCount: fbAggregate.emailPending,
    },
    health,
  };
};

/**
 * Searches and paginates through the User directory
 */
export const getUsersDirectory = async ({
  page = 1,
  limit = 20,
  search = '',
  status = 'ALL',
  verified = 'ALL',
  classification = 'ALL',
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  if (User.db?.readyState !== 1) {
    return { users: [], total: 0, page: 1, pages: 1 };
  }

  const query = {};

  // Classification filter (Real vs Demo)
  if (classification === 'REAL') {
    query.isDemo = { $ne: true };
    query.email = { $ne: DEMO_EMAIL };
  } else if (classification === 'DEMO') {
    query.$or = [{ isDemo: true }, { email: DEMO_EMAIL }];
  }

  // Account Status filter (ACTIVE vs SUSPENDED)
  if (status === 'ACTIVE') {
    query.isSuspended = { $ne: true };
  } else if (status === 'SUSPENDED') {
    query.isSuspended = true;
  }

  // Verification filter
  if (verified === 'VERIFIED') {
    query.emailVerified = true;
  } else if (verified === 'UNVERIFIED') {
    query.emailVerified = false;
  }

  // Search filter
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [{ name: regex }, { email: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortCriteria = { [sortBy]: sortDirection };

  const [rawUsers, total] = await Promise.all([
    User.find(query)
      .select('-password -verificationTokenHash -verificationTokenExpires -resetPasswordTokenHash -resetPasswordExpires')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  // Enrich with profile completion and activity counts
  const enrichedUsers = rawUsers.map((u) => ({
    ...u,
    profileCompletion: calculateProfileCompletion(u),
    isAdminUser: isAdminEmail(u.email),
  }));

  return {
    users: enrichedUsers,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Suspends an account and prevents subsequent authentication
 */
export const suspendUser = async ({ targetUserId, reason = 'Administrative suspension', actor }) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ApiError(400, 'Invalid User ID provided.');
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, 'User not found.');

  if (user.isDemo || user.email === DEMO_EMAIL) {
    throw new ApiError(400, 'The designated demo showcase account cannot be suspended.');
  }

  if (isAdminEmail(user.email)) {
    throw new ApiError(403, 'Cannot suspend an authorized administrator account.');
  }

  user.isSuspended = true;
  user.suspendedAt = new Date();
  user.suspensionReason = reason.trim();
  await user.save();

  await recordAuditLog({
    actor,
    action: 'USER_SUSPENDED',
    targetId: user._id,
    targetType: 'USER',
    details: { email: user.email, name: user.name, reason: user.suspensionReason },
  });

  return { success: true, message: `Account for ${user.email} has been suspended.`, user };
};

/**
 * Reactivates a suspended user account
 */
export const reactivateUser = async ({ targetUserId, actor }) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new ApiError(400, 'Invalid User ID provided.');
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, 'User not found.');

  user.isSuspended = false;
  user.suspendedAt = null;
  user.suspensionReason = null;
  await user.save();

  await recordAuditLog({
    actor,
    action: 'USER_REACTIVATED',
    targetId: user._id,
    targetType: 'USER',
    details: { email: user.email, name: user.name },
  });

  return { success: true, message: `Account for ${user.email} has been reactivated.`, user };
};

/**
 * Retrieves paginated feedback items with status & rating filters
 */
export const getAdminFeedbackInbox = async ({
  page = 1,
  limit = 20,
  status = 'ALL',
  rating = 'ALL',
  search = '',
}) => {
  if (Feedback.db?.readyState !== 1) {
    return { feedback: [], total: 0, page: 1, pages: 1 };
  }

  const query = {};
  if (status && status !== 'ALL') {
    query.status = status;
  }
  if (rating && rating !== 'ALL') {
    const num = parseInt(rating, 10);
    if (!isNaN(num)) query.rating = num;
  }
  if (search && search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { improvements: regex },
      { newFeatures: regex },
      { comments: regex },
      { submittedEmail: regex },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [feedback, total] = await Promise.all([
    Feedback.find(query)
      .populate('user', 'name email avatar isDemo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Feedback.countDocuments(query),
  ]);

  return {
    feedback,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Updates the administrative workflow status of a feedback item
 */
export const updateFeedbackStatus = async ({ feedbackId, status, actor }) => {
  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, 'Invalid Feedback ID.');
  }

  const validStatuses = ['NEW', 'REVIEWED', 'IN_PROGRESS', 'RESOLVED'];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new ApiError(404, 'Feedback item not found.');

  const previousStatus = feedback.status;
  feedback.status = status;

  if (status === 'RESOLVED') {
    feedback.resolvedAt = new Date();
    feedback.resolvedBy = actor.email;
  } else {
    feedback.resolvedAt = null;
    feedback.resolvedBy = null;
  }

  await feedback.save();

  await recordAuditLog({
    actor,
    action: 'FEEDBACK_STATUS_UPDATED',
    targetId: feedback._id,
    targetType: 'FEEDBACK',
    details: { previousStatus, newStatus: status, rating: feedback.rating },
  });

  return { success: true, feedback };
};

/**
 * Appends a private administrative note to a feedback item
 */
export const addFeedbackAdminNote = async ({ feedbackId, note, actor }) => {
  if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
    throw new ApiError(400, 'Invalid Feedback ID.');
  }

  if (!note || typeof note !== 'string' || !note.trim()) {
    throw new ApiError(400, 'Admin note content is required.');
  }

  const feedback = await Feedback.findById(feedbackId);
  if (!feedback) throw new ApiError(404, 'Feedback item not found.');

  const noteEntry = {
    note: note.trim(),
    adminEmail: actor.email,
    createdAt: new Date(),
  };

  feedback.adminNotes.push(noteEntry);
  await feedback.save();

  await recordAuditLog({
    actor,
    action: 'FEEDBACK_NOTE_ADDED',
    targetId: feedback._id,
    targetType: 'FEEDBACK',
    details: { noteLength: noteEntry.note.length },
  });

  return { success: true, adminNotes: feedback.adminNotes };
};

/**
 * Imports Google Forms exported CSV feedback entries into MongoDB
 */
export const importGoogleFormsCsv = async ({ csvContent, actor }) => {
  if (!csvContent || typeof csvContent !== 'string') {
    throw new ApiError(400, 'CSV content string is required.');
  }

  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new ApiError(400, 'CSV file must contain a header row and at least one data row.');
  }

  // Parse header
  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  
  // Identify column indices
  let ratingIdx = headers.findIndex((h) => h.includes('rate') || h.includes('rating') || h.includes('score'));
  let improvementsIdx = headers.findIndex((h) => h.includes('improv') || h.includes('change'));
  let newFeaturesIdx = headers.findIndex((h) => h.includes('feature') || h.includes('addition'));
  let commentsIdx = headers.findIndex((h) => h.includes('comment') || h.includes('feedback') || h.includes('thought'));
  let emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('address'));

  if (ratingIdx === -1) {
    // If no explicit rating column, default to 5 or first numeric column
    ratingIdx = 1;
  }

  let importedCount = 0;
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    // Simple CSV row parser handling quotes
    const values = [];
    let insideQuotes = false;
    let currentVal = '';

    for (let char of row) {
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

    const rawRating = parseInt(values[ratingIdx], 10);
    const rating = !isNaN(rawRating) && rawRating >= 1 && rawRating <= 5 ? rawRating : 5;

    const improvements = improvementsIdx !== -1 ? (values[improvementsIdx] || '').substring(0, 2000) : '';
    const newFeatures = newFeaturesIdx !== -1 ? (values[newFeaturesIdx] || '').substring(0, 2000) : '';
    const comments = commentsIdx !== -1 ? (values[commentsIdx] || '').substring(0, 2000) : (values[1] || '').substring(0, 2000);
    const submittedEmail = emailIdx !== -1 ? (values[emailIdx] || '').trim().toLowerCase() : null;

    try {
      await Feedback.create({
        rating,
        improvements,
        newFeatures,
        comments,
        submittedEmail,
        source: 'GOOGLE_FORMS_CSV',
        status: 'NEW',
        emailDelivered: false,
      });
      importedCount++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  await recordAuditLog({
    actor,
    action: 'FEEDBACK_IMPORTED',
    targetType: 'FEEDBACK_BATCH',
    details: { rowsProcessed: lines.length - 1, importedCount, failedRows: errors.length },
  });

  return {
    success: true,
    importedCount,
    errors: errors.slice(0, 10),
    totalRows: lines.length - 1,
  };
};

export default {
  getAdminOverviewMetrics,
  getUsersDirectory,
  suspendUser,
  reactivateUser,
  getAdminFeedbackInbox,
  updateFeedbackStatus,
  addFeedbackAdminNote,
  importGoogleFormsCsv,
};
