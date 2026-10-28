import mongoose from 'mongoose';
import Review from '../models/reviewModel.js';
import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';

export const mockReviewsStore = [];

export const createReview = async (reviewerId, reviewData) => {
  const { sessionId, revieweeId, teachingRating, communicationRating, reliabilityRating, feedbackText } = reviewData || {};

  if (!sessionId) {
    throw new ApiError(400, 'Session ID is required to submit a review');
  }

  // Validate ratings (1-5)
  let tRating = Number(teachingRating);
  let cRating = Number(communicationRating);
  let rRating = Number(reliabilityRating);

  // Fallback to single rating if multi-dimensional ratings omitted
  if ((isNaN(tRating) || isNaN(cRating) || isNaN(rRating)) && reviewData?.rating !== undefined) {
    const single = Number(reviewData.rating);
    tRating = single;
    cRating = single;
    rRating = single;
  }

  if ([tRating, cRating, rRating].some((r) => isNaN(r) || r < 1 || r > 5)) {
    throw new ApiError(400, 'Teaching, communication, and reliability ratings must be valid numbers between 1 and 5');
  }

  const overallRating = Math.round(((tRating + cRating + rRating) / 3) * 10) / 10;
  const callerIdStr = (reviewerId?._id ? reviewerId._id : reviewerId).toString();
  const cleanFeedback = (feedbackText || reviewData?.feedback || '').trim();

  // Normalize reviewee ID from object, string, or undefined
  let targetReviewee = revieweeId && typeof revieweeId === 'object' ? (revieweeId._id || revieweeId.id) : revieweeId;
  targetReviewee = targetReviewee ? targetReviewee.toString().trim() : null;
  if (!targetReviewee || targetReviewee === 'undefined' || targetReviewee === 'null' || targetReviewee === '[object Object]') {
    targetReviewee = null;
  }

  // Mock DB Mode (offline test fallback only)
  if (process.env.MOCK_DB === 'true' && Review.db?.readyState !== 1) {
    const { mockSessionsStore } = await import('./sessionService.js');
    const mockSession = mockSessionsStore.find((s) => s._id === sessionId);

    if (mockSession) {
      if (mockSession.status !== 'COMPLETED') {
        throw new ApiError(400, 'Reviews can only be submitted after an exchange session is completed');
      }

      const isParticipant = mockSession.participants.some(
        (p) => (p._id ? p._id.toString() : p.toString()) === callerIdStr
      );
      if (!isParticipant) {
        throw new ApiError(403, 'Forbidden: You are not an authorized participant in this session');
      }
    }

    if (targetReviewee && callerIdStr === targetReviewee) {
      throw new ApiError(400, 'You cannot review yourself');
    }

    if (!targetReviewee && mockSession) {
      const other = mockSession.participants.find(
        (p) => (p._id ? p._id.toString() : p.toString()) !== callerIdStr
      );
      if (other) {
        targetReviewee = (other._id ? other._id : other).toString();
      }
    }

    if (!targetReviewee) {
      targetReviewee = 'candidate_user_b';
    }

    if (callerIdStr === targetReviewee) {
      throw new ApiError(400, 'You cannot review yourself');
    }

    const existingMock = mockReviewsStore.find(
      (r) => r.session === sessionId && r.reviewer.toString() === callerIdStr
    );
    if (existingMock) {
      throw new ApiError(400, 'You have already submitted a review for this session');
    }

    const newMockReview = {
      _id: 'mock_review_' + Date.now(),
      reviewer: callerIdStr,
      reviewee: targetReviewee,
      session: sessionId,
      teachingRating: tRating,
      communicationRating: cRating,
      reliabilityRating: rRating,
      overallRating,
      feedbackText: cleanFeedback,
      createdAt: new Date().toISOString(),
    };
    mockReviewsStore.push(newMockReview);
    return newMockReview;
  }

  // Real MongoDB Mode
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new ApiError(404, 'Session not found');
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found');
  }

  if (session.status !== 'COMPLETED') {
    throw new ApiError(400, 'Reviews can only be submitted after an exchange session is completed');
  }

  // Verify caller is an authorized participant
  const isParticipant = session.participants.some(
    (p) => (p._id ? p._id.toString() : p.toString()) === callerIdStr
  );
  if (!isParticipant) {
    throw new ApiError(403, 'Forbidden: You are not an authorized participant in this session');
  }

  // Auto-resolve peer reviewee ID from session participants if not provided or empty
  if (!targetReviewee) {
    const otherParticipant = session.participants.find(
      (p) => (p._id ? p._id.toString() : p.toString()) !== callerIdStr
    );
    if (otherParticipant) {
      targetReviewee = (otherParticipant._id ? otherParticipant._id : otherParticipant).toString();
    }
  }

  if (!targetReviewee) {
    throw new ApiError(400, 'Unable to identify peer participant for this review');
  }

  const targetRevieweeId = targetReviewee;

  if (callerIdStr === targetRevieweeId) {
    throw new ApiError(400, 'You cannot review yourself');
  }

  // Verify target reviewee was a participant in this session
  const targetIsParticipant = session.participants.some(
    (p) => (p._id ? p._id.toString() : p.toString()) === targetRevieweeId
  );
  if (!targetIsParticipant) {
    throw new ApiError(400, 'The specified peer is not a participant in this exchange session');
  }

  // Check for duplicate review from this reviewer for this session
  const existing = await Review.findOne({ session: sessionId, reviewer: reviewerId });
  if (existing) {
    throw new ApiError(400, 'You have already submitted a review for this session');
  }

  const review = await Review.create({
    connection: session.connection || null,
    session: sessionId,
    reviewer: reviewerId,
    reviewee: targetRevieweeId,
    teachingRating: tRating,
    communicationRating: cRating,
    reliabilityRating: rRating,
    overallRating,
    feedbackText: cleanFeedback,
  });

  // Re-calculate reviewee reputation summary
  const allReviews = await Review.find({ reviewee: targetRevieweeId });
  const totalAvg = allReviews.reduce((acc, r) => acc + r.overallRating, 0) / (allReviews.length || 1);
  const roundedRating = Math.round(totalAvg * 10) / 10;

  await User.findByIdAndUpdate(targetRevieweeId, {
    reputation: {
      averageRating: roundedRating,
      reviewCount: allReviews.length,
    },
  });

  // Send notification to reviewee
  try {
    await Notification.create({
      recipient: targetRevieweeId,
      sender: reviewerId,
      type: 'REVIEW_RECEIVED',
      title: 'New Peer Review Received',
      message: `You received a ${overallRating}★ rating for your exchange session!`,
      link: `/profile`,
    });
  } catch (notifErr) {
    console.warn('[Notification Error]', notifErr.message);
  }

  return review;
};

export const getUserReviews = async (userId) => {
  if (process.env.MOCK_DB === 'true' && Review.db?.readyState !== 1) {
    return [
      {
        _id: 'mock_rev_1',
        reviewer: { name: 'Sarah Chen' },
        reviewee: userId,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
        overallRating: 5.0,
        feedbackText: 'Clear explanation of React hooks and clean code structure. Excellent exchange!',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return [];
  }

  return await Review.find({ reviewee: userId })
    .populate('reviewer', 'name avatar')
    .sort({ createdAt: -1 });
};

/**
 * Updates an existing review. Only the original author can edit their review.
 */
export const updateReview = async (reviewId, userId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new ApiError(404, 'Review not found');
  }

  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');

  const callerIdStr = (userId?._id ? userId._id : userId).toString();
  if (review.reviewer.toString() !== callerIdStr) {
    throw new ApiError(403, 'Forbidden: You can only edit your own reviews');
  }

  const { teachingRating, communicationRating, reliabilityRating, feedbackText, rating } = updateData || {};

  let tRating = Number(teachingRating);
  let cRating = Number(communicationRating);
  let rRating = Number(reliabilityRating);

  if ((isNaN(tRating) || isNaN(cRating) || isNaN(rRating)) && rating !== undefined) {
    const s = Number(rating);
    tRating = s;
    cRating = s;
    rRating = s;
  }

  // Preserve existing ratings if not updated
  if (isNaN(tRating)) tRating = review.teachingRating;
  if (isNaN(cRating)) cRating = review.communicationRating;
  if (isNaN(rRating)) rRating = review.reliabilityRating;

  if ([tRating, cRating, rRating].some((r) => isNaN(r) || r < 1 || r > 5)) {
    throw new ApiError(400, 'Teaching, communication, and reliability ratings must be valid numbers between 1 and 5');
  }

  const cleanFeedback = feedbackText !== undefined ? feedbackText.trim() : review.feedbackText;
  if (cleanFeedback.length > 1000) {
    throw new ApiError(400, 'Feedback cannot exceed 1000 characters');
  }

  const overallRating = Math.round(((tRating + cRating + rRating) / 3) * 10) / 10;

  review.teachingRating = tRating;
  review.communicationRating = cRating;
  review.reliabilityRating = rRating;
  review.overallRating = overallRating;
  review.feedbackText = cleanFeedback;
  await review.save();

  // Recalculate reviewee reputation
  const allReviews = await Review.find({ reviewee: review.reviewee });
  const totalAvg = allReviews.reduce((acc, r) => acc + r.overallRating, 0) / (allReviews.length || 1);
  const roundedRating = Math.round(totalAvg * 10) / 10;

  await User.findByIdAndUpdate(review.reviewee, {
    reputation: {
      averageRating: roundedRating,
      reviewCount: allReviews.length,
    },
  });

  return review;
};

/**
 * Deletes an existing review. Permitted for the author or an authorized admin.
 */
export const deleteReview = async (reviewId, userId, isAdmin = false) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    throw new ApiError(404, 'Review not found');
  }

  const review = await Review.findById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');

  const callerIdStr = (userId?._id ? userId._id : userId).toString();
  if (review.reviewer.toString() !== callerIdStr && !isAdmin) {
    throw new ApiError(403, 'Forbidden: You are not authorized to delete this review');
  }

  const targetRevieweeId = review.reviewee;
  await Review.findByIdAndDelete(reviewId);

  // Recalculate reviewee reputation
  const remainingReviews = await Review.find({ reviewee: targetRevieweeId });
  const avg =
    remainingReviews.length > 0
      ? Math.round((remainingReviews.reduce((acc, r) => acc + r.overallRating, 0) / remainingReviews.length) * 10) / 10
      : 5.0;

  await User.findByIdAndUpdate(targetRevieweeId, {
    reputation: {
      averageRating: avg,
      reviewCount: remainingReviews.length,
    },
  });

  return { success: true, message: 'Review deleted successfully' };
};

