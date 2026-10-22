import apiClient from './apiClient';

/**
 * Validates server-side admin privileges for current user session
 */
export const checkAdminStatus = async () => {
  return await apiClient.get('/admin/auth/check');
};

/**
 * Retrieves aggregate overview metrics
 */
export const getAdminOverview = async () => {
  return await apiClient.get('/admin/overview');
};

/**
 * Retrieves paginated, filterable user directory
 */
export const getAdminUsers = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.verified && params.verified !== 'ALL') query.append('verified', params.verified);
  if (params.classification && params.classification !== 'ALL') query.append('classification', params.classification);
  if (params.sortBy) query.append('sortBy', params.sortBy);
  if (params.sortOrder) query.append('sortOrder', params.sortOrder);

  return await apiClient.get(`/admin/users?${query.toString()}`);
};

/**
 * Suspends an account with administrative reason
 */
export const suspendUser = async (userId, reason) => {
  return await apiClient.patch(`/admin/users/${userId}/suspend`, { reason });
};

/**
 * Reactivates a suspended user account
 */
export const reactivateUser = async (userId) => {
  return await apiClient.patch(`/admin/users/${userId}/reactivate`);
};

/**
 * Retrieves platform analytics, trends, and conversion funnel
 */
export const getAdminAnalytics = async (days = 30) => {
  return await apiClient.get(`/admin/analytics?days=${days}`);
};

/**
 * Retrieves paginated feedback items with filters
 */
export const getAdminFeedback = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.rating && params.rating !== 'ALL') query.append('rating', params.rating);
  if (params.search) query.append('search', params.search);

  return await apiClient.get(`/admin/feedback?${query.toString()}`);
};

/**
 * Updates status of a feedback item (NEW, REVIEWED, IN_PROGRESS, RESOLVED)
 */
export const updateFeedbackStatus = async (feedbackId, status) => {
  return await apiClient.patch(`/admin/feedback/${feedbackId}/status`, { status });
};

/**
 * Appends a private administrative note to a feedback item
 */
export const addFeedbackNote = async (feedbackId, note) => {
  return await apiClient.post(`/admin/feedback/${feedbackId}/notes`, { note });
};

/**
 * Imports Google Forms exported CSV feedback entries
 */
export const importFeedbackCsv = async (csvContent) => {
  return await apiClient.post('/admin/feedback/import-csv', { csvContent });
};

/**
 * Retrieves real-time technical health, performance percentiles, and integration checks
 */
export const getAdminHealth = async () => {
  return await apiClient.get('/admin/health');
};

/**
 * Retrieves administrative audit trail logs
 */
export const getAdminAuditLogs = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);
  if (params.action && params.action !== 'ALL') query.append('action', params.action);
  if (params.search) query.append('search', params.search);

  return await apiClient.get(`/admin/audit-logs?${query.toString()}`);
};

export default {
  checkAdminStatus,
  getAdminOverview,
  getAdminUsers,
  suspendUser,
  reactivateUser,
  getAdminAnalytics,
  getAdminFeedback,
  updateFeedbackStatus,
  addFeedbackNote,
  importFeedbackCsv,
  getAdminHealth,
  getAdminAuditLogs,
};
