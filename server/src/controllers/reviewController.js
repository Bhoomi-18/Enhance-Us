import * as reviewService from '../services/reviewService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.user._id, req.body);
    return ApiResponse.success(res, 'Review submitted successfully', { review }, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

export const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getUserReviews(req.params.userId || req.user._id);
    return ApiResponse.success(res, 'Reviews retrieved', { reviews });
  } catch (error) {
    next(error);
  }
};
