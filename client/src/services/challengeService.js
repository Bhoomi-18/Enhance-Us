import apiClient from './apiClient';

export const getChallenges = async (params = {}) => {
  return await apiClient.get('/challenges', { params });
};

export const getUserChallenges = async () => {
  return await apiClient.get('/challenges/user');
};

export const getChallengeById = async (id) => {
  return await apiClient.get(`/challenges/${id}`);
};

export const createChallenge = async (challengeData) => {
  return await apiClient.post('/challenges', challengeData);
};

export const updateChallenge = async (id, updateData) => {
  return await apiClient.put(`/challenges/${id}`, updateData);
};

export const cancelChallenge = async (id, reason = '') => {
  return await apiClient.post(`/challenges/${id}/cancel`, { reason });
};

export const joinChallenge = async (id, payload = {}) => {
  return await apiClient.post(`/challenges/${id}/join`, payload);
};

export const leaveChallenge = async (id) => {
  return await apiClient.post(`/challenges/${id}/leave`);
};

export const completeMilestone = async (id, milestoneId, note = '') => {
  return await apiClient.post(`/challenges/${id}/milestones/${milestoneId}/complete`, { note });
};

export const undoMilestone = async (id, milestoneId) => {
  return await apiClient.post(`/challenges/${id}/milestones/${milestoneId}/undo`);
};

export const getChallengeUpdates = async (id, params = {}) => {
  return await apiClient.get(`/challenges/${id}/updates`, { params });
};

export const createChallengeUpdate = async (id, updateData) => {
  return await apiClient.post(`/challenges/${id}/updates`, updateData);
};

export const deleteChallengeUpdate = async (id, updateId) => {
  return await apiClient.delete(`/challenges/${id}/updates/${updateId}`);
};

export const getMyAchievements = async () => {
  return await apiClient.get('/challenges/achievements/my');
};

export const getPublicAchievements = async (userId) => {
  return await apiClient.get(`/challenges/achievements/user/${userId}`);
};

export default {
  getChallenges,
  getUserChallenges,
  getChallengeById,
  createChallenge,
  updateChallenge,
  cancelChallenge,
  joinChallenge,
  leaveChallenge,
  completeMilestone,
  undoMilestone,
  getChallengeUpdates,
  createChallengeUpdate,
  deleteChallengeUpdate,
  getMyAchievements,
  getPublicAchievements,
};
