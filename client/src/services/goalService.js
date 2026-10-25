import apiClient from './apiClient';

export const getGoals = async (status = '') => {
  return await apiClient.get('/goals', {
    params: status ? { status } : {},
  });
};

export const getGoal = async (id) => {
  return await apiClient.get(`/goals/${id}`);
};

export const analyzeGoal = async (goalData) => {
  return await apiClient.post('/goals/analyze', goalData);
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

export const toggleGoalStatus = async (id, status) => {
  return await apiClient.patch(`/goals/${id}/status`, { status });
};

export const toggleSkillCompletion = async (id, { skillId, skillName, isCompleted }) => {
  return await apiClient.patch(`/goals/${id}/skills/toggle`, { skillId, skillName, isCompleted });
};

export const addRequiredSkill = async (id, skillData) => {
  return await apiClient.post(`/goals/${id}/skills`, skillData);
};

export const removeRequiredSkill = async (id, skillName, skillId) => {
  return await apiClient.delete(`/goals/${id}/skills/${encodeURIComponent(skillName || '')}`, {
    params: skillId ? { skillId } : {},
    data: { skillName, skillId },
  });
};
