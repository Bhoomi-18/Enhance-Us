import apiClient from './apiClient';

/**
 * Retrieve curated resources filtered by skillName or type
 */
export const getResources = async (params = {}) => {
  return await apiClient.get('/resources', { params });
};

/**
 * Retrieve all resources bookmarked by authenticated user
 */
export const getBookmarkedResources = async () => {
  return await apiClient.get('/resources/bookmarked');
};

/**
 * Toggle bookmark for a resource
 */
export const toggleResourceBookmark = async (resourceId) => {
  return await apiClient.post(`/resources/${resourceId}/bookmark`);
};

/**
 * Rate resource usefulness (isUseful: true / false)
 */
export const rateResource = async (resourceId, isUseful) => {
  return await apiClient.post(`/resources/${resourceId}/rate`, { isUseful });
};

export default {
  getResources,
  getBookmarkedResources,
  toggleResourceBookmark,
  rateResource,
};
