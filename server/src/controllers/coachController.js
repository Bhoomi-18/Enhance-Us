import * as coachService from '../services/coachService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getRecommendations = async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    if (req.user?.isDemo && req.user?.workspaceId) {
      const recs = await demoWorkspaceService.getCoachRecommendations(req.user.workspaceId);
      return ApiResponse.success(res, 'Recommendations retrieved successfully', { recommendations: recs, fromCache: true });
    }
    const result = await coachService.getPersonalizedRecommendations(req.user._id, { forceRefresh });
    return ApiResponse.success(res, 'Recommendations retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const updateRecommendation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, userFeedback, dismissalReason } = req.body;
    if (req.user?.isDemo && req.user?.workspaceId) {
      const updated = await demoWorkspaceService.updateCoachRecommendationStatus(req.user.workspaceId, id, {
        status,
        dismissalReason: dismissalReason || userFeedback,
      });
      return ApiResponse.success(res, 'Recommendation status updated', { recommendation: updated });
    }
    const updated = await coachService.updateRecommendationStatus(req.user._id, id, {
      status,
      userFeedback,
      dismissalReason,
    });
    return ApiResponse.success(res, 'Recommendation status updated', { recommendation: updated });
  } catch (error) {
    next(error);
  }
};

export const askCoach = async (req, res, next) => {
  try {
    const { query, context } = req.body;
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.getCoachingAdvice(req.user.workspaceId, query);
      return ApiResponse.success(res, 'Coach guidance retrieved', result);
    }
    const result = await coachService.askCoach(req.user._id, query, context);
    return ApiResponse.success(res, 'Coach guidance retrieved', result);
  } catch (error) {
    next(error);
  }
};

export default {
  getRecommendations,
  updateRecommendation,
  askCoach,
};
