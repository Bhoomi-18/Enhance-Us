import apiClient from './apiClient';

/**
 * Submit contextual query to AI Learning Assistant
 */
export const queryAssistant = async ({ roadmapId, milestoneId = null, actionType = 'GENERAL_QUERY', query = '' }) => {
  return await apiClient.post(
    '/assistant/query',
    { roadmapId, milestoneId, actionType, query },
    { timeout: 25000 }
  );
};

/**
 * Evaluate submitted answer to knowledge check question
 */
export const evaluateAnswer = async ({ questionId, selectedAnswer, correctAnswer, explanation }) => {
  return await apiClient.post('/assistant/evaluate', {
    questionId,
    selectedAnswer,
    correctAnswer,
    explanation,
  });
};

/**
 * Retrieve conversation history for a roadmap
 */
export const getAssistantConversation = async (roadmapId) => {
  return await apiClient.get(`/assistant/conversation/${roadmapId}`);
};

/**
 * Clear conversation history for a roadmap
 */
export const clearAssistantConversation = async (roadmapId) => {
  return await apiClient.delete(`/assistant/conversation/${roadmapId}`);
};

export default {
  queryAssistant,
  evaluateAnswer,
  getAssistantConversation,
  clearAssistantConversation,
};
