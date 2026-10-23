import apiClient from './apiClient';

export const getMatches = async (params = {}) => {
  // Support both legacy single string goalId argument or full params object
  const queryParams = typeof params === 'string' ? { goalId: params } : params;
  return await apiClient.get('/matches', {
    params: queryParams,
  });
};

export const getMatch = async (id) => {
  return await apiClient.get(`/matches/${id}`);
};

export default {
  getMatches,
  getMatch,
};
