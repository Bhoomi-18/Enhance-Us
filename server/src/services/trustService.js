import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';
import { mockSessionsStore } from './sessionService.js';
import Review from '../models/reviewModel.js';
import Circle from '../models/circleModel.js';
import { mockCirclesStore } from './circleService.js';
import PortfolioItem from '../models/portfolioItemModel.js';
import { mockPortfolioStore } from './portfolioService.js';
import { mockReviewsStore } from './reviewService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Calculates a transparent, auditable Trust & Contribution profile
 * directly from underlying application records.
 */
export const getTrustAndContributionProfile = async (targetUserId) => {
  const userIdStr = (targetUserId?._id || targetUserId || '').toString().trim();
  if (!userIdStr) {
    throw new ApiError(400, 'Target user ID is required');
  }

  // 1. Fetch User Record
  let user;
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    user = {
      _id: userIdStr,
      name: 'Contributor User',
      email: 'contributor@enhanceus.test',
      createdAt: new Date('2026-01-01'),
      isDemo: false,
    };
  } else {
    user = await User.findById(userIdStr).select('name email isDemo createdAt role').lean();
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
  }

  // 2. Fetch Sessions Data (Individual & Group)
  let sessions = [];
  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    sessions = mockSessionsStore.filter((s) => {
      const isParticipant = (s.participants || []).some(
        (p) => (p?._id || p || '').toString() === userIdStr
      );
      const isHost = (s.host?._id || s.host || '').toString() === userIdStr;
      return isParticipant || isHost;
    });
  } else {
    sessions = await Session.find({
      $or: [{ participants: userIdStr }, { host: userIdStr }],
    }).lean();
  }

  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const missedSessions = sessions.filter((s) => s.status === 'MISSED');
  const cancelledSessions = sessions.filter((s) => s.status === 'CANCELLED');
  const scheduledSessions = sessions.filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS');

  const completed1on1Count = completedSessions.filter((s) => !s.isGroupSession).length;
  const completedGroupCount = completedSessions.filter((s) => s.isGroupSession).length;

  // Calculate Attendance Rate
  // Formula: Completed / (Completed + Missed) * 100
  // Mutually agreed cancellations (status === 'CANCELLED') are excluded from denominator to avoid penalizing users
  const totalAccountableSessions = completedSessions.length + missedSessions.length;
  const attendanceRate =
    totalAccountableSessions > 0
      ? Math.round((completedSessions.length / totalAccountableSessions) * 100)
      : null;

  // 3. Fetch Peer Reviews Data
  let reviews = [];
  if (process.env.MOCK_DB === 'true' && Review.db?.readyState !== 1) {
    reviews = mockReviewsStore.filter((r) => {
      const revieweeId = (r.reviewee?._id || r.reviewee || '').toString();
      const reviewerId = (r.reviewer?._id || r.reviewer || '').toString();
      // Exclude self-ratings
      return revieweeId === userIdStr && reviewerId !== userIdStr;
    });
  } else {
    reviews = await Review.find({
      reviewee: userIdStr,
      reviewer: { $ne: userIdStr }, // Enforce exclusion of self-ratings
    }).lean();
  }

  const reviewCount = reviews.length;
  let teachingRatingAvg = null;
  let communicationRatingAvg = null;
  let reliabilityRatingAvg = null;
  let overallRatingAvg = null;

  const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  if (reviewCount > 0) {
    let tSum = 0;
    let cSum = 0;
    let rSum = 0;
    let oSum = 0;

    for (const rev of reviews) {
      tSum += Number(rev.teachingRating) || 5;
      cSum += Number(rev.communicationRating) || 5;
      rSum += Number(rev.reliabilityRating) || 5;
      oSum += Number(rev.overallRating) || 5;

      const roundedOverall = Math.min(5, Math.max(1, Math.round(rev.overallRating || 5)));
      ratingDistribution[roundedOverall] = (ratingDistribution[roundedOverall] || 0) + 1;
    }

    teachingRatingAvg = Math.round((tSum / reviewCount) * 10) / 10;
    communicationRatingAvg = Math.round((cSum / reviewCount) * 10) / 10;
    reliabilityRatingAvg = Math.round((rSum / reviewCount) * 10) / 10;
    overallRatingAvg = Math.round((oSum / reviewCount) * 10) / 10;
  }

  // 4. Fetch Portfolio Artifacts Data
  let portfolioItems = [];
  if (process.env.MOCK_DB === 'true' && PortfolioItem.db?.readyState !== 1) {
    portfolioItems = mockPortfolioStore.filter(
      (p) => (p.user?._id || p.user || '').toString() === userIdStr
    );
  } else {
    portfolioItems = await PortfolioItem.find({ user: userIdStr }).lean();
  }

  const exchangeConfirmedCount = portfolioItems.filter(
    (i) => i.verificationStatus === 'EXCHANGE_CONFIRMED'
  ).length;
  const portfolioEvidenceCount = portfolioItems.filter(
    (i) => i.verificationStatus === 'PORTFOLIO_EVIDENCE'
  ).length;
  const selfReportedCount = portfolioItems.filter(
    (i) => i.verificationStatus === 'SELF_REPORTED'
  ).length;

  // 5. Fetch Learning Circles Participation Data
  let userCircles = [];
  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    userCircles = mockCirclesStore.filter((c) =>
      (c.members || []).some((m) => (m.user?._id || m.user || '').toString() === userIdStr)
    );
  } else {
    userCircles = await Circle.find({
      'members.user': userIdStr,
      status: { $ne: 'CLOSED' },
    }).lean();
  }

  let circleTasksCompletedCount = 0;
  let circlesModeratedCount = 0;

  for (const c of userCircles) {
    const memberRecord = (c.members || []).find(
      (m) => (m.user?._id || m.user || '').toString() === userIdStr
    );
    if (memberRecord && (memberRecord.role === 'OWNER' || memberRecord.role === 'MODERATOR')) {
      circlesModeratedCount++;
    }

    // Check completed tasks in collaborative roadmap
    const milestones = c.collaborativeRoadmap?.milestones || [];
    for (const m of milestones) {
      const tasks = m.tasks || [];
      for (const t of tasks) {
        if (
          (t.completedBy || []).some(
            (u) => (u?._id || u || '').toString() === userIdStr
          )
        ) {
          circleTasksCompletedCount++;
        }
      }
    }
  }

  // 6. Fairness & Newcomer Baseline Rules
  const isNewContributor = reviewCount < 2 && completedSessions.length < 2;

  let standingStatus = 'VERIFIED_CONTRIBUTOR';
  let standingScore = null;
  let confidenceLevel = 'HIGH';
  let standingLabel = 'Established Contributor';

  if (isNewContributor) {
    standingStatus = 'NEW_CONTRIBUTOR';
    standingLabel = 'New Contributor — Establishing Exchange Record';
    confidenceLevel = 'BASELINE';
    // Do NOT penalize new users with zero or failing score
    standingScore = null;
  } else {
    // Transparent Composite Formula:
    // 40% Attendance Rate (default 100 if no missed sessions)
    // 40% Peer Rating (normalized 0-100)
    // 20% Verified Portfolio & Circle Evidence (capped at 100)
    const effectiveAttendance = attendanceRate !== null ? attendanceRate : 100;
    const effectiveRating = overallRatingAvg !== null ? (overallRatingAvg / 5) * 100 : 100;
    const verifiedEvidencePoints = Math.min(
      100,
      exchangeConfirmedCount * 25 + portfolioEvidenceCount * 15 + circleTasksCompletedCount * 10
    );

    const rawComposite =
      0.4 * effectiveAttendance + 0.4 * effectiveRating + 0.2 * verifiedEvidencePoints;

    standingScore = Math.min(100, Math.max(0, Math.round(rawComposite)));

    if (reviewCount < 4) {
      confidenceLevel = 'MODERATE';
    }
  }

  return {
    userId: userIdStr,
    userName: user.name,
    isNewContributor,
    standing: {
      status: standingStatus,
      label: standingLabel,
      score: standingScore, // null for new contributors to prevent unfair low baseline
      confidenceLevel,
      formula: '0.40 * AttendanceRate + 0.40 * (PeerRating / 5 * 100) + 0.20 * VerifiedEvidencePoints',
      exclusions: 'Mutually cancelled sessions, self-ratings, and unverified claims are strictly excluded from calculations.',
      disclaimer: 'This indicator is an application-defined contribution metric based on auditable platform activities, not an objective evaluation of personal character.',
    },
    metrics: {
      exchanges: {
        completedTotal: completedSessions.length,
        completed1on1: completed1on1Count,
        completedGroup: completedGroupCount,
        scheduled: scheduledSessions.length,
        missed: missedSessions.length,
        mutuallyCancelled: cancelledSessions.length,
        attendanceRate: attendanceRate !== null ? `${attendanceRate}%` : 'N/A (New Contributor)',
        attendanceRateNumeric: attendanceRate,
      },
      peerFeedback: {
        sampleSize: reviewCount,
        overallRatingAverage: overallRatingAvg,
        teachingRatingAverage: teachingRatingAvg,
        communicationRatingAverage: communicationRatingAvg,
        reliabilityRatingAverage: reliabilityRatingAvg,
        distribution: ratingDistribution,
      },
      portfolioEvidence: {
        totalArtifacts: portfolioItems.length,
        exchangeConfirmed: exchangeConfirmedCount,
        portfolioEvidence: portfolioEvidenceCount,
        selfReported: selfReportedCount,
      },
      circleContributions: {
        circlesJoined: userCircles.length,
        circlesModerated: circlesModeratedCount,
        tasksCompleted: circleTasksCompletedCount,
      },
    },
    auditTimestamp: new Date(),
  };
};

export default {
  getTrustAndContributionProfile,
};
