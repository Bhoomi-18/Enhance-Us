import * as goalService from '../services/goalService.js';
import { validateGoalInput } from '../validators/goalValidator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createGoal = async (req, res, next) => {
  try {
    validateGoalInput(req.body);
    const goal = await goalService.createGoal(req.user._id, req.body);
    return ApiResponse.success(res, 'Goal created and analyzed successfully', { goal }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const goals = await goalService.getUserGoals(req.user._id, status);
    return ApiResponse.success(res, 'Goals retrieved successfully', { goals });
  } catch (error) {
    next(error);
  }
};

export const getGoal = async (req, res, next) => {
  try {
    const goal = await goalService.getGoalById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Goal retrieved successfully', { goal });
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (req, res, next) => {
  try {
    const goal = await goalService.updateGoal(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Goal updated successfully', { goal });
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (req, res, next) => {
  try {
    await goalService.deleteGoal(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Goal deleted successfully');
  } catch (error) {
    next(error);
  }
};
