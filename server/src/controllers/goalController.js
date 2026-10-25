import * as goalService from '../services/goalService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { validateGoalInput, validateGoalAnalysisInput } from '../validators/goalValidator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const analyzeGoalPreview = async (req, res, next) => {
  try {
    validateGoalAnalysisInput(req.body);
    if (req.user?.isDemo && req.user?.workspaceId) {
      const analysis = await demoWorkspaceService.previewGoalAnalysis(req.user.workspaceId, req.body);
      return ApiResponse.success(res, 'Goal analyzed successfully', { analysis }, HTTP_STATUS.OK);
    }
    const analysis = await goalService.previewGoalAnalysis(req.user._id, req.body);
    return ApiResponse.success(res, 'Goal analyzed successfully', { analysis }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const createGoal = async (req, res, next) => {
  try {
    validateGoalInput(req.body);
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.createGoal(req.user.workspaceId, req.body);
      return ApiResponse.success(res, 'Goal created and analyzed successfully', { goal }, HTTP_STATUS.CREATED);
    }
    const goal = await goalService.createGoal(req.user._id, req.body);
    return ApiResponse.success(res, 'Goal created and analyzed successfully', { goal }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const { status } = req.query;
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goals = await demoWorkspaceService.getGoals(req.user.workspaceId, status);
      return ApiResponse.success(res, 'Goals retrieved successfully', { goals });
    }
    const goals = await goalService.getUserGoals(req.user._id, status);
    return ApiResponse.success(res, 'Goals retrieved successfully', { goals });
  } catch (error) {
    next(error);
  }
};

export const getGoal = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.getGoal(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Goal retrieved successfully', { goal });
    }
    const goal = await goalService.getGoalById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Goal retrieved successfully', { goal });
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.updateGoal(req.user.workspaceId, req.params.id, req.body);
      return ApiResponse.success(res, 'Goal updated successfully', { goal });
    }
    const goal = await goalService.updateGoal(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Goal updated successfully', { goal });
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      await demoWorkspaceService.deleteGoal(req.user.workspaceId, req.params.id);
      return ApiResponse.success(res, 'Goal deleted successfully');
    }
    await goalService.deleteGoal(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Goal deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const toggleGoalStatus = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.toggleGoalStatus(req.user.workspaceId, req.params.id, req.body);
      return ApiResponse.success(res, 'Goal status updated successfully', { goal });
    }
    const goal = await goalService.toggleGoalStatus(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Goal status updated successfully', { goal });
  } catch (error) {
    next(error);
  }
};

export const toggleSkillCompletion = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.toggleRequiredSkillCompletion(
        req.user.workspaceId,
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, 'Skill completion updated successfully', { goal });
    }
    const goal = await goalService.toggleRequiredSkillCompletion(
      req.params.id,
      req.user._id,
      req.body
    );
    return ApiResponse.success(res, 'Skill completion updated successfully', { goal });
  } catch (error) {
    next(error);
  }
};

export const addRequiredSkill = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.addRequiredSkillToGoal(
        req.user.workspaceId,
        req.params.id,
        req.body
      );
      return ApiResponse.success(res, 'Required skill added to goal', { goal });
    }
    const goal = await goalService.addRequiredSkillToGoal(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Required skill added to goal', { goal });
  } catch (error) {
    next(error);
  }
};

export const removeRequiredSkill = async (req, res, next) => {
  try {
    const skillName = req.params.skillName || req.body?.skillName;
    const skillId = req.query?.skillId || req.body?.skillId;
    if (req.user?.isDemo && req.user?.workspaceId) {
      const goal = await demoWorkspaceService.removeRequiredSkillFromGoal(
        req.user.workspaceId,
        req.params.id,
        { skillName, skillId }
      );
      return ApiResponse.success(res, 'Required skill removed from goal', { goal });
    }
    const goal = await goalService.removeRequiredSkillFromGoal(req.params.id, req.user._id, {
      skillName,
      skillId,
    });
    return ApiResponse.success(res, 'Required skill removed from goal', { goal });
  } catch (error) {
    next(error);
  }
};
