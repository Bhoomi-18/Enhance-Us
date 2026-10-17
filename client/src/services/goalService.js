import apiClient from './apiClient';

export const getGoals = async (status = '') => {
  return await apiClient.get('/goals', {
    params: status ? { status } : {},
  });
};

export const getGoal = async (id) => {
  return await apiClient.get(`/goals/${id}`);
};

export const createGoal = async (goalData) => {
  return await apiClient.post('/goals', goalData);
};

export const updateGoal = async (id, goalData) => {
  return await apiClient.patch(`/goals/${id}`, goalData);
};

export const deleteGoal = async (id) => {
  return await apiClient.delete(`/goals/${id}`);
};
