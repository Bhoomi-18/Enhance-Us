import apiClient from './apiClient';

export const createReview = async (reviewData) => {
  return await apiClient.post('/reviews', reviewData);
};

export const getUserReviews = async (userId) => {
  return await apiClient.get(`/reviews/user/${userId}`);
};

export const updateReview = async (reviewId, updateData) => {
  return await apiClient.patch(`/reviews/${reviewId}`, updateData);
};

export const deleteReview = async (reviewId) => {
  return await apiClient.delete(`/reviews/${reviewId}`);
};

export default {
  createReview,
  getUserReviews,
  updateReview,
  deleteReview,
};

