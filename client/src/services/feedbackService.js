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

export const GOOGLE_FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSdiJd5eEAGJ2-r1ybqp_KVDiV84AkB4y3g6_q7wbv2laY-yeg/viewform?usp=publish-editor';

export default {
  submitFeedback,
  GOOGLE_FEEDBACK_FORM_URL,
};
