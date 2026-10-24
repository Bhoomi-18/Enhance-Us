import * as trustService from '../services/trustService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getUserTrustProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.user?._id;
    if (req.user?.isDemo && req.user?.workspaceId && (!req.params.userId || req.params.userId === req.user._id?.toString())) {
      const profile = await demoWorkspaceService.getUserTrustProfile(req.user.workspaceId);
      return ApiResponse.success(res, 'Trust and contribution profile retrieved', profile);
    }
    const profile = await trustService.getTrustAndContributionProfile(targetUserId);
    return ApiResponse.success(res, 'Trust and contribution profile retrieved', profile);
  } catch (error) {
    next(error);
  }
};

export default {
  getUserTrustProfile,
};
