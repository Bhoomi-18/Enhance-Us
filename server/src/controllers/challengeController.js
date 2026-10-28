import * as challengeService from '../services/challengeService.js';
import * as achievementService from '../services/achievementService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createChallenge = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const challenge = await demoWorkspaceService.createDemoChallenge(
        req.user.workspaceId,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Challenge created successfully', { challenge }, HTTP_STATUS.CREATED);
    }

    const challenge = await challengeService.createChallenge(req.user._id, req.body);
    return ApiResponse.success(res, 'Challenge created successfully', { challenge }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getChallenges = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const challenges = await demoWorkspaceService.getDemoChallenges(
        req.user.workspaceId,
        req.query,
        req.user
      );
      return ApiResponse.success(res, 'Challenges retrieved successfully', { challenges });
    }

    const userId = req.user ? req.user._id : null;
    const challenges = await challengeService.getChallenges(userId, req.query);
    return ApiResponse.success(res, 'Challenges retrieved successfully', { challenges });
  } catch (error) {
    next(error);
  }
};

export const getUserChallenges = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const data = await demoWorkspaceService.getUserDemoChallenges(req.user.workspaceId, req.user);
      return ApiResponse.success(res, 'User challenges retrieved successfully', data);
    }

    const data = await challengeService.getUserChallenges(req.user._id);
    return ApiResponse.success(res, 'User challenges retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const getChallengeById = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const challenge = await demoWorkspaceService.getDemoChallengeById(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, 'Challenge retrieved successfully', { challenge });
    }

    const userId = req.user ? req.user._id : null;
    const challenge = await challengeService.getChallengeById(req.params.id, userId);
    return ApiResponse.success(res, 'Challenge retrieved successfully', { challenge });
  } catch (error) {
    next(error);
  }
};

export const updateChallenge = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    if (req.user?.isDemo && req.user?.workspaceId) {
      const challenge = await demoWorkspaceService.updateDemoChallenge(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Challenge updated successfully', { challenge });
    }

    const challenge = await challengeService.updateChallenge(req.params.id, req.user._id, req.body, isAdmin);
    return ApiResponse.success(res, 'Challenge updated successfully', { challenge });
  } catch (error) {
    next(error);
  }
};

export const cancelChallenge = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.cancelDemoChallenge(
        req.user.workspaceId,
        req.params.id,
        req.body?.reason,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await challengeService.cancelChallenge(req.params.id, req.user._id, req.body?.reason, isAdmin);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const joinChallenge = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.joinDemoChallenge(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
    }

    const result = await challengeService.joinChallenge(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, result.message, result, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const leaveChallenge = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.leaveDemoChallenge(
        req.user.workspaceId,
        req.params.id,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await challengeService.leaveChallenge(req.params.id, req.user._id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const completeMilestone = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.completeDemoMilestone(
        req.user.workspaceId,
        req.params.id,
        req.params.milestoneId,
        req.body?.note,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await challengeService.completeMilestone(
      req.params.id,
      req.params.milestoneId,
      req.user._id,
      req.body?.note
    );
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const undoMilestone = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.undoDemoMilestone(
        req.user.workspaceId,
        req.params.id,
        req.params.milestoneId,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await challengeService.undoMilestone(req.params.id, req.params.milestoneId, req.user._id);
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const createChallengeUpdate = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const update = await demoWorkspaceService.createDemoChallengeUpdate(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user
      );
      return ApiResponse.success(res, 'Progress update posted successfully', { update }, HTTP_STATUS.CREATED);
    }

    const update = await challengeService.createChallengeUpdate(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Progress update posted successfully', { update }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getChallengeUpdates = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const data = await demoWorkspaceService.getDemoChallengeUpdates(
        req.user.workspaceId,
        req.params.id,
        req.query
      );
      return ApiResponse.success(res, 'Challenge updates retrieved', data);
    }

    const data = await challengeService.getChallengeUpdates(req.params.id, req.query);
    return ApiResponse.success(res, 'Challenge updates retrieved', data);
  } catch (error) {
    next(error);
  }
};

export const deleteChallengeUpdate = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.deleteDemoChallengeUpdate(
        req.user.workspaceId,
        req.params.id,
        req.params.updateId,
        req.user
      );
      return ApiResponse.success(res, result.message, result);
    }

    const result = await challengeService.deleteChallengeUpdate(
      req.params.id,
      req.params.updateId,
      req.user._id,
      isAdmin
    );
    return ApiResponse.success(res, result.message, result);
  } catch (error) {
    next(error);
  }
};

export const getUserAchievements = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const data = await demoWorkspaceService.getUserDemoAchievements(req.user.workspaceId, req.user);
      return ApiResponse.success(res, 'User achievements retrieved successfully', data);
    }

    const data = await achievementService.getUserAchievements(req.user._id);
    return ApiResponse.success(res, 'User achievements retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

export const getPublicUserAchievements = async (req, res, next) => {
  try {
    const data = await achievementService.getPublicUserAchievements(req.params.userId);
    return ApiResponse.success(res, 'Public achievements retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};
