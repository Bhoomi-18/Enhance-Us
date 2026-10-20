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

export default {
  getRoadmaps,
  getRoadmap,
  generateRoadmap,
  deleteRoadmap,
  analyzeRoadmapDependencies,
};

