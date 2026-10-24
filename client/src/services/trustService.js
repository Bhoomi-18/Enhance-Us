import apiClient from './apiClient';

export const getUserTrustProfile = async (userId) => {
  return await apiClient.get(`/trust/${userId}`);
};

export const getMyTrustProfile = async () => {
  return await apiClient.get('/trust/me');
};

export default {
  getUserTrustProfile,
  getMyTrustProfile,
};
