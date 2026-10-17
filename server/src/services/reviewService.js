import Review from '../models/reviewModel.js';
import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';

export const createReview = async (reviewerId, reviewData) => {
  const { sessionId, revieweeId, teachingRating, communicationRating, reliabilityRating, feedbackText } = reviewData;

  if (reviewerId.toString() === revieweeId.toString()) {
    throw new ApiError(400, 'You cannot review yourself');
  }

  if (process.env.MOCK_DB === 'true') {
    return {
      _id: 'mock_review_' + Date.now(),
      reviewer: reviewerId,
      reviewee: revieweeId,
      session: sessionId,
      teachingRating: teachingRating || 5,
      communicationRating: communicationRating || 5,
      reliabilityRating: reliabilityRating || 5,
      overallRating: 5,
      feedbackText: feedbackText || 'Great exchange partner!',
      createdAt: new Date().toISOString(),
    };
  }

  // Check if session exists and is completed
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  if (session.status !== 'COMPLETED') {
    throw new ApiError(400, 'Reviews can only be submitted after an exchange session is completed');
  }

  // Check for duplicate review
  const existing = await Review.findOne({ session: sessionId, reviewer: reviewerId });
  if (existing) {
    throw new ApiError(400, 'You have already submitted a review for this session');
  }

  const overallRating = Math.round(
    ((teachingRating + communicationRating + reliabilityRating) / 3) * 10
  ) / 10;

  const review = await Review.create({
    connection: session.connection,
    session: sessionId,
    reviewer: reviewerId,
    reviewee: revieweeId,
    teachingRating,
    communicationRating,
    reliabilityRating,
    overallRating,
    feedbackText: feedbackText || '',
  });

  // Re-calculate reviewee reputation summary
  const allReviews = await Review.find({ reviewee: revieweeId });
  const totalAvg = allReviews.reduce((acc, r) => acc + r.overallRating, 0) / (allReviews.length || 1);
  const roundedRating = Math.round(totalAvg * 10) / 10;

  await User.findByIdAndUpdate(revieweeId, {
    reputation: {
      averageRating: roundedRating,
      reviewCount: allReviews.length,
    },
  });

  // Send notification to reviewee
  await Notification.create({
    recipient: revieweeId,
    sender: reviewerId,
    type: 'REVIEW_RECEIVED',
    title: 'New Peer Review Received',
    message: `You received a ${overallRating}★ rating for your exchange session!`,
    link: `/profile`,
  });

  return review;
};

export const getUserReviews = async (userId) => {
  if (process.env.MOCK_DB === 'true') {
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

  return await Review.find({ reviewee: userId })
    .populate('reviewer', 'name avatar')
    .sort({ createdAt: -1 });
};
