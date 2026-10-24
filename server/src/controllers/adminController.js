import * as adminService from '../services/adminService.js';
import * as analyticsService from '../services/analyticsService.js';
import * as auditService from '../services/auditService.js';
import { getSystemHealthSnapshot } from '../services/performanceTracker.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Validates that current session has active, verified admin privileges
 */
export const checkAdminStatus = async (req, res, next) => {
  try {
    return ApiResponse.success(
      res,
      'Admin authorization verified',
      {
        isAdmin: true,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
        },
      },
      HTTP_STATUS.OK
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves aggregate platform overview metrics
 */
export const getOverview = async (req, res, next) => {
  try {
    const data = await adminService.getAdminOverviewMetrics();
    return ApiResponse.success(res, 'Overview metrics retrieved', data, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves paginated, filterable user directory
 */
export const getUsers = async (req, res, next) => {
  try {
    const data = await adminService.getUsersDirectory(req.query);
    return ApiResponse.success(res, 'User directory retrieved', data, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Retrieves specific user details for administrative inspection
 */
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await adminService.getUserDetails({ targetUserId: id });
    return ApiResponse.success(res, 'User details retrieved', data, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Suspends an account
 */
export const suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await adminService.suspendUser({
      targetUserId: id,
      reason,
      actor: req.user,
    });
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Reactivates an account
 */
export const reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await adminService.reactivateUser({
      targetUserId: id,
      actor: req.user,
    });
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Platform usage analytics and conversion funnel
 */
export const getAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const [platformAnalytics, conversionFunnel] = await Promise.all([
      analyticsService.getPlatformAnalytics(days),
      analyticsService.getConversionFunnel(),
    ]);

    return ApiResponse.success(
      res,
      'Analytics retrieved',
      {
        ...platformAnalytics,
        conversionFunnel,
      },
      HTTP_STATUS.OK
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Feedback inbox with status filters
 */
export const getFeedback = async (req, res, next) => {
  try {
    const data = await adminService.getAdminFeedbackInbox(req.query);
    return ApiResponse.success(res, 'Feedback inbox retrieved', data, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Updates status of a feedback item
 */
export const updateFeedbackStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const result = await adminService.updateFeedbackStatus({
      feedbackId: id,
      status,
      actor: req.user,
    });
    return ApiResponse.success(res, 'Feedback status updated', result, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Appends a private note to a feedback item
 */
export const addFeedbackNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    const result = await adminService.addFeedbackAdminNote({
      feedbackId: id,
      note,
      actor: req.user,
    });
    return ApiResponse.success(res, 'Admin note added', result, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Imports Google Forms feedback responses via CSV
 */
export const importFeedbackCsv = async (req, res, next) => {
  try {
    const { csvContent } = req.body || {};
    const result = await adminService.importGoogleFormsCsv({
      csvContent,
      actor: req.user,
    });
    return ApiResponse.success(
      res,
      `Successfully imported ${result.importedCount} feedback records.`,
      result,
      HTTP_STATUS.OK
    );
  } catch (err) {
    next(err);
  }
};

/**
 * System health, performance percentiles, and integration check
 */
export const getHealth = async (req, res, next) => {
  try {
    const health = await getSystemHealthSnapshot();
    return ApiResponse.success(res, 'System health snapshot retrieved', health, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

/**
 * Administrative audit logs
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const data = await auditService.getAuditLogs(req.query);
    return ApiResponse.success(res, 'Audit logs retrieved', data, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
};

export default {
  checkAdminStatus,
  getOverview,
  getUsers,
  getUserById,
  suspendUser,
  reactivateUser,
  getAnalytics,
  getFeedback,
  updateFeedbackStatus,
  addFeedbackNote,
  importFeedbackCsv,
  getHealth,
  getAuditLogs,
};
