import api from './apiClient';

export const submitReport = async (reportData) => {
  const response = await api.post('/reports', reportData);
  return response.data;
};

export const getAdminReports = async (filters = {}) => {
  const response = await api.get('/admin/reports', { params: filters });
  return response.data;
};

export const getAdminReportById = async (reportId) => {
  const response = await api.get(`/admin/reports/${reportId}`);
  return response.data;
};

export const moderateReport = async (reportId, moderationData) => {
  const response = await api.patch(`/admin/reports/${reportId}`, moderationData);
  return response.data;
};

export default {
  submitReport,
  getAdminReports,
  getAdminReportById,
  moderateReport,
};
