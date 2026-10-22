import apiClient from './apiClient';

export const register = async (userData) => {
  return await apiClient.post('/auth/register', userData);
};

export const login = async (credentials) => {
  return await apiClient.post('/auth/login', credentials);
};

export const logout = async () => {
  return await apiClient.post('/auth/logout');
};

export const getMe = async () => {
  return await apiClient.get('/auth/me');
};

export const verifyEmail = async (token) => {
  return await apiClient.post('/auth/verify-email', { token });
};

export const resendVerification = async (email) => {
  return await apiClient.post('/auth/resend-verification', { email });
};

export const forgotPassword = async (email) => {
  return await apiClient.post('/auth/forgot-password', { email });
};

export const resetPassword = async ({ token, password }) => {
  return await apiClient.post('/auth/reset-password', { token, password });
};
