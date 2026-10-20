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

export const updateMilestone = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const { action, notes, learnerNotes, blockedReason } = req.body || {};
    const effectiveNotes = notes !== undefined ? notes : learnerNotes;
    const result = await roadmapService.updateRoadmapMilestone(
      id,
      milestoneId,
      action,
      { notes: effectiveNotes, learnerNotes: effectiveNotes, blockedReason },
      req.user._id
    );
    return ApiResponse.success(
      res,
      'Milestone status updated successfully',
      result
    );
  } catch (error) {
    next(error);
  }
};

export const proposeMilestoneBreakdown = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const { reason, userNote } = req.body || {};
    const proposal = await roadmapService.proposeRoadmapMilestoneBreakdown(
      id,
      milestoneId,
      reason || userNote || '',
      req.user._id
    );
    return ApiResponse.success(
      res,
      'Milestone breakdown proposed successfully',
      proposal
    );
  } catch (error) {
    next(error);
  }
};

export const applyMilestoneBreakdown = async (req, res, next) => {
  try {
    const { id, milestoneId } = req.params;
    const { subMilestones, reason } = req.body || {};
    const result = await roadmapService.applyRoadmapMilestoneBreakdown(
      id,
      milestoneId,
      subMilestones,
      reason,
      req.user._id
    );
    return ApiResponse.success(
      res,
      'Milestone breakdown applied successfully',
      result
    );
  } catch (error) {
    next(error);
  }
};

export const initializeMilestones = async (req, res, next) => {
  try {
    const { id } = req.params;
    const roadmap = await roadmapService.initializeRoadmapMilestones(id, req.user._id);
    return ApiResponse.success(
      res,
      'Roadmap milestones initialized successfully',
      { roadmap }
    );
  } catch (error) {
    next(error);
  }
};


