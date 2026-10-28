import * as reviewService from '../services/reviewService.js';
import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const createReview = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const ws = await demoWorkspaceService.getOrCreateWorkspace(req.user.workspaceId);
      const {
        sessionId,
        revieweeId,
        teachingRating,
        communicationRating,
        reliabilityRating,
        rating,
        feedbackText,
        feedback,
      } = req.body || {};

      let tRating = Number(teachingRating);
      let cRating = Number(communicationRating);
      let rRating = Number(reliabilityRating);

      if ((isNaN(tRating) || isNaN(cRating) || isNaN(rRating)) && rating !== undefined) {
        const s = Number(rating);
        tRating = s;
        cRating = s;
        rRating = s;
      }

      if ([tRating, cRating, rRating].some((r) => isNaN(r) || r < 1 || r > 5)) {
        throw new ApiError(400, 'Teaching, communication, and reliability ratings must be valid numbers between 1 and 5');
      }

      const overallRating = Math.round(((tRating + cRating + rRating) / 3) * 10) / 10;
      const targetReviewee = revieweeId || 'demo_peer_sarah_002';
      const cleanFeedback = (feedbackText || feedback || '').trim();

      const newRev = {
        _id: 'demo_rev_' + Date.now(),
        session: sessionId,
        reviewer: {
          _id: req.user._id,
          name: ws.data.profile?.name || 'Alex Morgan',
          avatar: ws.data.profile?.avatar,
        },
        reviewee: targetReviewee,
        teachingRating: tRating,
        communicationRating: cRating,
        reliabilityRating: rRating,
        overallRating,
        rating: overallRating,
        feedbackText: cleanFeedback,
        feedback: cleanFeedback,
        createdAt: new Date().toISOString(),
      };

      ws.data.reviews = ws.data.reviews || [];
      ws.data.reviews.push(newRev);

      // Update peer reputation in demo workspace
      if (ws.data.peers) {
        const peer = ws.data.peers.find((p) => p._id === targetReviewee);
        if (peer) {
          const peerReviews = ws.data.reviews.filter((r) => r.reviewee === targetReviewee);
          const avg = peerReviews.reduce((acc, r) => acc + (r.overallRating || r.rating || 5), 0) / peerReviews.length;
          peer.reputation = {
            averageRating: Math.round(avg * 10) / 10,
            reviewCount: peerReviews.length,
          };
        }
      }

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

export const updateReview = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const review = await demoWorkspaceService.updateReview(
        req.user.workspaceId,
        req.params.id,
        req.body,
        req.user._id
      );
      return ApiResponse.success(res, 'Review updated successfully', { review }, HTTP_STATUS.OK);
    }

    const review = await reviewService.updateReview(req.params.id, req.user._id, req.body);
    return ApiResponse.success(res, 'Review updated successfully', { review }, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    if (req.user?.isDemo && req.user?.workspaceId) {
      const result = await demoWorkspaceService.deleteReview(
        req.user.workspaceId,
        req.params.id,
        req.user._id
      );
      return ApiResponse.success(res, result.message, null, HTTP_STATUS.OK);
    }

    const isAdmin = Boolean(req.user?.role === 'admin' || req.isAdmin);
    const result = await reviewService.deleteReview(req.params.id, req.user._id, isAdmin);
    return ApiResponse.success(res, result.message, null, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

