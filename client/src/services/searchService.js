import apiClient from './apiClient';

export const globalSearch = async (params) => {
  return await apiClient.get('/search', { params });
};
