import * as reviewService from '../services/reviewService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createReview = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const ws = await demoWorkspaceService.getOrCreateWorkspace(req.user.workspaceId);
      const newRev = {
        _id: 'demo_rev_' + Date.now(),
        session: req.body.sessionId,
        reviewer: req.user._id,
        rating: req.body.rating,
        feedback: req.body.feedback,
        createdAt: new Date().toISOString(),
      };
      ws.data.reviews = ws.data.reviews || [];
      ws.data.reviews.push(newRev);
      await demoWorkspaceService.saveWorkspace(ws);
      return ApiResponse.success(res, 'Review submitted successfully', { review: newRev }, HTTP_STATUS.CREATED);
    }
    const review = await reviewService.createReview(req.user._id, req.body);
    return ApiResponse.success(res, 'Review submitted successfully', { review }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getUserReviews = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const ws = await demoWorkspaceService.getOrCreateWorkspace(req.user.workspaceId);
      return ApiResponse.success(res, 'Reviews retrieved', { reviews: ws.data.reviews || [] });
    }
    const reviews = await reviewService.getUserReviews(req.params.userId || req.user._id);
    return ApiResponse.success(res, 'Reviews retrieved', { reviews });
  } catch (error) {
    next(error);
  }
};
