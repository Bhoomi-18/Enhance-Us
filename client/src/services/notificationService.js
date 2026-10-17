import apiClient from './apiClient';

export const getNotifications = async () => {
  return await apiClient.get('/notifications');
};

export const markAsRead = async (id) => {
  return await apiClient.patch(`/notifications/${id}/read`);
};

export const markAllAsRead = async () => {
  return await apiClient.patch('/notifications/read-all');
};
