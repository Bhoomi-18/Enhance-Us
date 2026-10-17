import apiClient from './apiClient';

export const createReview = async (reviewData) => {
  return await apiClient.post('/reviews', reviewData);
};

export const getUserReviews = async (userId) => {
  return await apiClient.get(`/reviews/user/${userId}`);
};
