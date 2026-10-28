import apiClient from './apiClient';

export const createWorkspace = async (workspaceData) => {
  return await apiClient.post('/workspaces', workspaceData);
};

export const getUserWorkspaces = async () => {
  return await apiClient.get('/workspaces');
};

export const getDiscoverableWorkspaces = async (params = {}) => {
  return await apiClient.get('/workspaces/discover', { params });
};

export const getWorkspaceById = async (id) => {
  return await apiClient.get(`/workspaces/${id}`);
};

export const updateWorkspace = async (id, data) => {
  return await apiClient.patch(`/workspaces/${id}`, data);
};

export const inviteMember = async (id, payload) => {
  return await apiClient.post(`/workspaces/${id}/invite`, payload);
};

export const respondToInvitation = async (id, action) => {
  return await apiClient.post(`/workspaces/${id}/invitation/respond`, { action });
};

export const removeMember = async (id, memberId) => {
  return await apiClient.delete(`/workspaces/${id}/members/${memberId}`);
};

export const addMilestone = async (id, milestoneData) => {
  return await apiClient.post(`/workspaces/${id}/milestones`, milestoneData);
};

export const updateMilestone = async (id, milestoneId, milestoneData) => {
  return await apiClient.patch(`/workspaces/${id}/milestones/${milestoneId}`, milestoneData);
};

export const deleteMilestone = async (id, milestoneId) => {
  return await apiClient.delete(`/workspaces/${id}/milestones/${milestoneId}`);
};

export const addResource = async (id, resourceData) => {
  return await apiClient.post(`/workspaces/${id}/resources`, resourceData);
};

export const deleteResource = async (id, resourceId) => {
  return await apiClient.delete(`/workspaces/${id}/resources/${resourceId}`);
};

export const updateNotes = async (id, content) => {
  return await apiClient.patch(`/workspaces/${id}/notes`, { content });
};

export const addDiscussionMessage = async (id, content) => {
  return await apiClient.post(`/workspaces/${id}/discussions`, { content });
};

export default {
  createWorkspace,
  getUserWorkspaces,
  getDiscoverableWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  inviteMember,
  respondToInvitation,
  removeMember,
  addMilestone,
  updateMilestone,
  deleteMilestone,
  addResource,
  deleteResource,
  updateNotes,
  addDiscussionMessage
};
