import apiClient from './apiClient';

export const getMatches = async (goalId = '') => {
  return await apiClient.get('/matches', {
    params: goalId ? { goalId } : {},
  });
};

export const getMatch = async (id) => {
  return await apiClient.get(`/matches/${id}`);
};
