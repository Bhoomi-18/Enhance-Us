import learningAssistantService from '../services/learningAssistantService.js';
import ApiResponse from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';

export const postQuery = async (req, res, next) => {
  try {
    const { roadmapId, milestoneId, actionType, query } = req.body || {};

    if (!roadmapId) {
      throw new ApiError(400, 'Roadmap identifier (roadmapId) is required for contextual learning assistance');
    }

    const result = await learningAssistantService.processQuery({
      userId: req.user._id,
      roadmapId,
      milestoneId,
      actionType,
      query,
    });

    return ApiResponse.success(res, 'AI assistant guidance generated successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const { roadmapId } = req.params;
    const conversation = await learningAssistantService.getConversation(req.user._id, roadmapId);
    return ApiResponse.success(res, 'Conversation history retrieved successfully', conversation);
  } catch (error) {
    next(error);
  }
};

export const clearConversation = async (req, res, next) => {
  try {
    const { roadmapId } = req.params;
    const result = await learningAssistantService.clearConversation(req.user._id, roadmapId);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const evaluateAnswer = async (req, res, next) => {
  try {
    const { questionId, selectedAnswer, correctAnswer, explanation } = req.body || {};

    if (!selectedAnswer || !correctAnswer) {
      throw new ApiError(400, 'Selected answer and correct answer keys are required');
    }

    const isCorrect = (selectedAnswer || '').trim().toUpperCase() === (correctAnswer || '').trim().toUpperCase();

    const evaluation = {
      questionId,
      selectedAnswer,
      correctAnswer,
      isCorrect,
      explanation: explanation || (isCorrect ? 'Correct! Excellent comprehension.' : `The correct answer is Option ${correctAnswer}.`),
      feedback: isCorrect
        ? '🎉 Correct! You demonstrated accurate conceptual understanding.'
        : `Not quite. Option ${correctAnswer} is the recommended pattern. Review the explanation to reinforce your mental model.`,
    };

    return ApiResponse.success(res, 'Answer evaluated successfully', evaluation);
  } catch (error) {
    next(error);
  }
};

export default {
  postQuery,
  getConversation,
  clearConversation,
  evaluateAnswer,
};
