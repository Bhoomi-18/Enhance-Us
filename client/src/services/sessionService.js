import apiClient from './apiClient';

export const createSession = async (sessionData) => {
  return await apiClient.post('/sessions', sessionData);
};

export const getSessions = async (status = '') => {
  return await apiClient.get('/sessions', { params: status ? { status } : {} });
};

export const completeSession = async (id) => {
  return await apiClient.post(`/sessions/${id}/complete`);
};

export const cancelSession = async (id) => {
  return await apiClient.post(`/sessions/${id}/cancel`);
};
