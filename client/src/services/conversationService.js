import apiClient from './apiClient';

export const getConversations = async () => {
  return await apiClient.get('/conversations');
};

export const getConversation = async (id) => {
  return await apiClient.get(`/conversations/${id}`);
};

export const sendMessage = async (id, text) => {
  return await apiClient.post(`/conversations/${id}/messages`, { text });
};
