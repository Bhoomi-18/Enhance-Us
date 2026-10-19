import apiClient from './apiClient';

/**
 * Submit user feedback to the backend API
 * @param {Object} feedbackData
 * @param {number} feedbackData.rating (1-5)
 * @param {string} [feedbackData.improvements]
 * @param {string} [feedbackData.newFeatures]
 * @param {string} [feedbackData.comments]
 */
export const submitFeedback = async (feedbackData) => {
  const response = await apiClient.post('/feedback', feedbackData);
  return response.data;
};

export default {
  submitFeedback,
};
