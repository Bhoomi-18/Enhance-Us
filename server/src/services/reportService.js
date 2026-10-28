import mongoose from 'mongoose';
import Report, { REPORT_CATEGORIES, REPORT_STATUSES, MODERATION_ACTIONS } from '../models/reportModel.js';
import User from '../models/userModel.js';
import Review from '../models/reviewModel.js';
import { recordAuditLog } from './auditService.js';
import { ApiError } from '../utils/apiError.js';

export const createReport = async (reporterId, reportData) => {
  if (!reporterId) throw new ApiError(401, 'Authentication required to submit a report');

  const { targetType, targetId, category, reason, reportedUserId, metadata } = reportData || {};

  if (!category || !REPORT_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Category must be one of: ${REPORT_CATEGORIES.join(', ')}`);
  }

  const validTargetTypes = ['USER', 'REVIEW', 'SKILL_EVIDENCE', 'CIRCLE_POST', 'OTHER'];
  if (!targetType || !validTargetTypes.includes(targetType)) {
    throw new ApiError(400, `Target type must be one of: ${validTargetTypes.join(', ')}`);
  }

  if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
    throw new ApiError(400, 'Target identifier is required');
  }

  const cleanReason = (reason || '').trim();
  if (cleanReason.length < 5) {
    throw new ApiError(400, 'Explanation must be at least 5 characters long');
  }
  if (cleanReason.length > 1000) {
    throw new ApiError(400, 'Explanation cannot exceed 1000 characters');
  }

  // Resolve reported user reference
  let resolvedReportedUserId = reportedUserId;

  if (targetType === 'USER') {
    resolvedReportedUserId = targetId.trim();
  } else if (targetType === 'REVIEW') {
    if (mongoose.Types.ObjectId.isValid(targetId.trim())) {
      const review = await Review.findById(targetId.trim());
      if (!review) throw new ApiError(404, 'Reported review does not exist');
      resolvedReportedUserId = review.reviewer.toString();
    }
  }

  if (!resolvedReportedUserId) {
    throw new ApiError(400, 'Unable to identify the user associated with this report');
  }

  // Verify target user actually exists
  if (!mongoose.Types.ObjectId.isValid(resolvedReportedUserId)) {
    throw new ApiError(400, 'Invalid reported user ID format');
  }

  const reportedUser = await User.findById(resolvedReportedUserId);
  if (!reportedUser) {
    throw new ApiError(404, 'Reported user does not exist');
  }

  // Prevent self-reporting
  const reporterIdStr = reporterId.toString();
  if (reporterIdStr === resolvedReportedUserId.toString()) {
    throw new ApiError(400, 'You cannot submit a report against your own profile or content');
  }

  // Prevent duplicate pending reports from the same reporter for the same item
  const existingPending = await Report.findOne({
    reporter: reporterId,
    targetType,
    targetId: targetId.trim(),
    status: { $in: ['PENDING', 'INVESTIGATING'] },
  });

  if (existingPending) {
    throw new ApiError(
      409,
      'You have already submitted a report for this content that is currently pending moderation'
    );
  }

  const report = await Report.create({
    reporter: reporterId,
    reportedUser: resolvedReportedUserId,
    targetType,
    targetId: targetId.trim(),
    category,
    reason: cleanReason,
    status: 'PENDING',
    metadata: metadata || {},
  });

  return {
    _id: report._id,
    targetType: report.targetType,
    targetId: report.targetId,
    category: report.category,
    status: report.status,
    createdAt: report.createdAt,
    message: 'Report submitted successfully. Our moderation team will review this content.',
  };
};

export const getReports = async (filters = {}) => {
  const { status, category, targetType } = filters;
  const query = {};

  if (status && REPORT_STATUSES.includes(status)) {
    query.status = status;
  }
  if (category && REPORT_CATEGORIES.includes(category)) {
    query.category = category;
  }
  if (targetType) {
    query.targetType = targetType;
  }

  const reports = await Report.find(query)
    .populate('reporter', 'name email isDemo')
    .populate('reportedUser', 'name email isSuspended isDemo')
    .sort({ createdAt: -1 })
    .lean();

  return reports;
};

export const getReportById = async (reportId) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'Report not found');
  }

  const report = await Report.findById(reportId)
    .populate('reporter', 'name email')
    .populate('reportedUser', 'name email isSuspended')
    .populate('moderatedBy', 'name email');

  if (!report) throw new ApiError(404, 'Report not found');
  return report;
};

export const moderateReport = async (adminUser, reportId, moderationData) => {
  if (!adminUser) throw new ApiError(401, 'Admin authorization required');
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(404, 'Report not found');
  }

  const { status, moderationNotes, actionTaken } = moderationData || {};

  if (status && !REPORT_STATUSES.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${REPORT_STATUSES.join(', ')}`);
  }
  if (actionTaken && !MODERATION_ACTIONS.includes(actionTaken)) {
    throw new ApiError(400, `Action must be one of: ${MODERATION_ACTIONS.join(', ')}`);
  }

  const report = await Report.findById(reportId);
  if (!report) throw new ApiError(404, 'Report not found');

  const cleanNotes = (moderationNotes || '').trim();
  if (cleanNotes.length > 1000) {
    throw new ApiError(400, 'Moderation notes cannot exceed 1000 characters');
  }

  const previousStatus = report.status;
  report.status = status || report.status;
  report.actionTaken = actionTaken || report.actionTaken;
  report.moderationNotes = cleanNotes || report.moderationNotes;
  report.moderatedBy = adminUser._id;
  report.moderatedAt = new Date();

  // If action is USER_SUSPENDED, perform account suspension
  if (actionTaken === 'USER_SUSPENDED' && report.reportedUser) {
    const { suspendUser } = await import('./adminService.js');
    await suspendUser({
      targetUserId: report.reportedUser.toString(),
      reason: `Moderation decision on report #${report._id}: ${cleanNotes || report.category}`,
      actor: adminUser,
    }).catch((err) => console.warn('[Auto-Suspend Warning]', err.message));
  }

  await report.save();

  // Audit moderation action
  await recordAuditLog({
    actor: adminUser,
    action: `REPORT_MODERATED_${report.status}`,
    targetId: report._id.toString(),
    targetType: 'REPORT',
    details: {
      reportId: report._id,
      previousStatus,
      newStatus: report.status,
      actionTaken: report.actionTaken,
      notes: report.moderationNotes,
      reportedUser: report.reportedUser,
    },
  }).catch((err) => console.warn('[Audit Log Error]', err.message));

  return report;
};

export default {
  createReport,
  getReports,
  getReportById,
  moderateReport,
};
