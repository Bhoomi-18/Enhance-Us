import apiClient from './apiClient';

export const updateProfile = async (profileData) => {
  return await apiClient.patch('/users/profile', profileData);
};

export const getPublicProfile = async (userId) => {
  return await apiClient.get(`/users/${userId}`);
};
export const completeOnboarding = async () => {
  return await apiClient.post('/users/onboarding/complete', {});
};

export const deleteAccount = async ({ password, confirmationPhrase }) => {
  return await apiClient.delete('/users/me', {
    data: { password, confirmationPhrase },
  });
};
