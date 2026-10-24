import * as sessionService from '../services/sessionService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createSession = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const session = await demoWorkspaceService.createSession(req.user.workspaceId, req.body);
      return ApiResponse.success(res, 'Session scheduled successfully', { session }, HTTP_STATUS.CREATED);
    }
    const session = await sessionService.createSession(req.user._id, req.body);
    return ApiResponse.success(res, 'Session scheduled successfully', { session }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const { status } = req.query;
    if (req.user?.isDemo && req.user?.workspaceId) {
      const sessions = await demoWorkspaceService.getSessions(req.user.workspaceId, { status });
      return ApiResponse.success(res, 'Sessions retrieved', { sessions });
    }
    const sessions = await sessionService.getUserSessions(req.user._id, status);
    return ApiResponse.success(res, 'Sessions retrieved', { sessions });
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const session = await demoWorkspaceService.updateSessionStatus(req.user.workspaceId, req.params.id, 'COMPLETED');
      return ApiResponse.success(res, 'Session completion updated', { session });
    }
    const session = await sessionService.completeSession(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Session completion updated', { session });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const session = await demoWorkspaceService.updateSessionStatus(req.user.workspaceId, req.params.id, 'CANCELLED');
      return ApiResponse.success(res, 'Session cancelled', { session });
    }
    const session = await sessionService.cancelSession(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Session cancelled', { session });
  } catch (error) {
    next(error);
  }
};
