import apiClient from './apiClient';

export const getCoachRecommendations = async (refresh = false) => {
  return await apiClient.get(`/coach/recommendations${refresh ? '?refresh=true' : ''}`);
};

export const updateRecommendationStatus = async (id, status, feedbackData = {}) => {
  return await apiClient.patch(`/coach/recommendations/${id}`, {
    status,
    ...feedbackData,
  });
};

export const askCoach = async (query, context = {}) => {
  return await apiClient.post('/coach/ask', {
    query,
    context,
  });
};

export default {
  getCoachRecommendations,
  updateRecommendationStatus,
  askCoach,
};
