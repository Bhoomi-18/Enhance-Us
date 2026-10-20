import apiClient from './apiClient';

/**
 * Retrieve all roadmaps owned by the authenticated user
 */
export const getRoadmaps = async (params = {}) => {
  return await apiClient.get('/roadmaps', { params });
};

/**
 * Fetch a single roadmap by its ID
 */
export const getRoadmap = async (id) => {
  return await apiClient.get(`/roadmaps/${id}`);
};

/**
 * Generate a new AI roadmap from an owned goal with optional user context
 */
export const generateRoadmap = async (goalId, context = {}) => {
  // Pass an extended timeout of 35s to allow Gemini to complete generation without premature client cutoff
  return await apiClient.post(`/roadmaps/generate/${goalId}`, context, {
    timeout: 35000,
  });
};

/**
 * Delete a roadmap owned by the authenticated user
 */
export const deleteRoadmap = async (id) => {
  return await apiClient.delete(`/roadmaps/${id}`);
};

/**
 * Analyze or recalculate skill prerequisites and deterministic learning order (V2.2)
 */
export const analyzeRoadmapDependencies = async (id, options = {}) => {
  return await apiClient.post(`/roadmaps/${id}/analyze-dependencies`, options, {
    timeout: 30000,
  });
};

/**
 * Update milestone status (START, COMPLETE, REOPEN, BLOCK, UPDATE_NOTES) (V2.3)
 */
export const updateMilestone = async (roadmapId, milestoneId, payload = {}) => {
  return await apiClient.patch(`/roadmaps/${roadmapId}/milestones/${milestoneId}`, payload);
};

/**
 * Propose adaptive breakdown of a complex milestone (V2.3)
 */
export const proposeMilestoneBreakdown = async (roadmapId, milestoneId, payload = {}) => {
  return await apiClient.post(`/roadmaps/${roadmapId}/milestones/${milestoneId}/propose-breakdown`, payload, {
    timeout: 20000,
  });
};

/**
 * Apply adaptive breakdown: replace target milestone with sub-milestones (V2.3)
 */
export const applyMilestoneBreakdown = async (roadmapId, milestoneId, payload = {}) => {
  return await apiClient.post(`/roadmaps/${roadmapId}/milestones/${milestoneId}/apply-breakdown`, payload);
};

/**
 * Explicitly initialize milestones for an existing roadmap (V2.3)
 */
export const initializeMilestones = async (roadmapId) => {
  return await apiClient.post(`/roadmaps/${roadmapId}/milestones/initialize`);
};

export default {
  getRoadmaps,
  getRoadmap,
  generateRoadmap,
  deleteRoadmap,
  analyzeRoadmapDependencies,
  updateMilestone,
  proposeMilestoneBreakdown,
  applyMilestoneBreakdown,
  initializeMilestones,
};


