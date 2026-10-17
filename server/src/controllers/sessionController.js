import * as sessionService from '../services/sessionService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createSession = async (req, res, next) => {
  try {
    const session = await sessionService.createSession(req.user._id, req.body);
    return ApiResponse.success(res, 'Session scheduled successfully', { session }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const sessions = await sessionService.getUserSessions(req.user._id, status);
    return ApiResponse.success(res, 'Sessions retrieved', { sessions });
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (req, res, next) => {
  try {
    const session = await sessionService.completeSession(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Session completion updated', { session });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (req, res, next) => {
  try {
    const session = await sessionService.cancelSession(req.params.id, req.user._id);
    return ApiResponse.success(res, 'Session cancelled', { session });
  } catch (error) {
    next(error);
  }
};
