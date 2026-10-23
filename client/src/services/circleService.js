import apiClient from './apiClient';

export const getCircles = async (params = {}) => {
  return await apiClient.get('/circles', { params });
};

export const getCircleById = async (id) => {
  return await apiClient.get(`/circles/${id}`);
};

export const createCircle = async (circleData) => {
  return await apiClient.post('/circles', circleData);
};

export const updateCircle = async (id, circleData) => {
  return await apiClient.patch(`/circles/${id}`, circleData);
};

export const joinCircle = async (id, payload = {}) => {
  return await apiClient.post(`/circles/${id}/join`, payload);
};

export const leaveCircle = async (id) => {
  return await apiClient.post(`/circles/${id}/leave`);
};

export const manageJoinRequest = async (id, requestId, action) => {
  return await apiClient.patch(`/circles/${id}/requests/${requestId}`, { action });
};

export const updateMemberRole = async (id, userId, role) => {
  return await apiClient.patch(`/circles/${id}/members/${userId}/role`, { role });
};

export const removeMember = async (id, userId) => {
  return await apiClient.delete(`/circles/${id}/members/${userId}`);
};

export const closeCircle = async (id) => {
  return await apiClient.post(`/circles/${id}/close`);
};

// Collaborative Roadmap
export const addMilestone = async (id, milestoneData) => {
  return await apiClient.post(`/circles/${id}/milestones`, milestoneData);
};

export const updateMilestone = async (id, milestoneId, milestoneData) => {
  return await apiClient.patch(`/circles/${id}/milestones/${milestoneId}`, milestoneData);
};

export const addTask = async (id, milestoneId, taskData) => {
  return await apiClient.post(`/circles/${id}/milestones/${milestoneId}/tasks`, taskData);
};

export const toggleTask = async (id, milestoneId, taskId) => {
  return await apiClient.patch(`/circles/${id}/milestones/${milestoneId}/tasks/${taskId}/toggle`);
};

// Group Sessions
export const proposeSession = async (id, sessionData) => {
  return await apiClient.post(`/circles/${id}/sessions`, sessionData);
};

export const getSessions = async (id) => {
  return await apiClient.get(`/circles/${id}/sessions`);
};

export const rsvpSession = async (sessionId, status, reflection = '') => {
  return await apiClient.post(`/circles/sessions/${sessionId}/rsvp`, { status, reflection });
};

// Discussions & Announcements
export const getPosts = async (id, params = {}) => {
  return await apiClient.get(`/circles/${id}/posts`, { params });
};

export const createPost = async (id, postData) => {
  return await apiClient.post(`/circles/${id}/posts`, postData);
};

export const addReply = async (id, postId, content) => {
  return await apiClient.post(`/circles/${id}/posts/${postId}/replies`, { content });
};

export const deletePost = async (id, postId) => {
  return await apiClient.delete(`/circles/${id}/posts/${postId}`);
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
  addMilestone,
  updateMilestone,
  addTask,
  toggleTask,
  proposeSession,
  getSessions,
  rsvpSession,
  getPosts,
  createPost,
  addReply,
  deletePost,
};
