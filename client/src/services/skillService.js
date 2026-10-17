import apiClient from './apiClient';

export const getSkills = async (search = '', category = '') => {
  return await apiClient.get('/skills', {
    params: { search, category },
  });
};

export const createSkill = async (skillData) => {
  return await apiClient.post('/skills', skillData);
};
