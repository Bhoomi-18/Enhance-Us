import * as roadmapService from '../services/roadmapService.js';
import { validateRoadmapGenerationInput } from '../validators/roadmapValidator.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const generateRoadmapForGoal = async (req, res, next) => {
  try {
    const { goalId } = req.params;
    validateRoadmapGenerationInput(goalId, req.body);

    const roadmap = await roadmapService.generateRoadmap(req.user._id, goalId, req.body);
    return ApiResponse.success(
      res,
      'Roadmap generated successfully',
      { roadmap },
      HTTP_STATUS.CREATED
    );
  } catch (error) {
    next(error);
  }
};

export const getUserRoadmaps = async (req, res, next) => {
  try {
    const roadmaps = await roadmapService.getUserRoadmaps(req.user._id, req.query);
    return ApiResponse.success(res, 'Roadmaps retrieved successfully', { roadmaps });
  } catch (error) {
    next(error);
  }
};

export const getRoadmap = async (req, res, next) => {
  try {
    const roadmap = await roadmapService.getRoadmapById(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Roadmap retrieved successfully', { roadmap });
  } catch (error) {
    next(error);
  }
};

export const deleteRoadmap = async (req, res, next) => {
  try {
    await roadmapService.deleteRoadmap(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Roadmap deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const analyzeRoadmapDependencies = async (req, res, next) => {
  try {
    const roadmap = await roadmapService.analyzeRoadmapDependencies(
      req.params.id,
      req.user._id,
      req.body || {}
    );
    return ApiResponse.success(
      res,
      'Roadmap dependencies and learning order analyzed successfully',
      { roadmap }
    );
  } catch (error) {
    next(error);
  }
};

