import apiClient from './apiClient';

export const getCommunityInsights = async () => {
  return await apiClient.get('/insights/community');
};

export default {
  getCommunityInsights,
};
