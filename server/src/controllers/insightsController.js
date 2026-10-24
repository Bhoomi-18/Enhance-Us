import * as communityInsightsService from '../services/communityInsightsService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getCommunityInsights = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const insights = await demoWorkspaceService.getCommunityInsights(req.user.workspaceId);
      return ApiResponse.success(res, 'Community skill-gap insights retrieved', insights);
    }
    const insights = await communityInsightsService.getCommunitySkillGapInsights();
    return ApiResponse.success(res, 'Community skill-gap insights retrieved', insights);
  } catch (error) {
    next(error);
  }
};

export default {
  getCommunityInsights,
};
