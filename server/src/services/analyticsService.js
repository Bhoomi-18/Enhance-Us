import AnalyticsEvent from '../models/analyticsEventModel.js';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';
import Goal from '../models/goalModel.js';
import Roadmap from '../models/roadmapModel.js';
import Feedback from '../models/feedbackModel.js';
import Circle from '../models/circleModel.js';
import ExchangeRequest from '../models/exchangeRequestModel.js';
import Challenge from '../models/challengeModel.js';
import ChallengeParticipation from '../models/challengeParticipationModel.js';
import Workspace from '../models/workspaceModel.js';
import { DEMO_EMAIL } from './authService.js';

/**
 * Strips sensitive keys (passwords, tokens, cookies, auth headers) from event metadata
 */
const sanitizeMetadata = (obj) => {
  if (!obj || typeof obj !== 'object') return {};
  const clean = { ...obj };
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'accessToken', 'jwt'];
  for (const key of Object.keys(clean)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      delete clean[key];
    }
  }
  return clean;
};

/**
 * Non-blocking event recorder
 */
export const recordEvent = async (firstArg, secondArg, thirdArg, fourthArg) => {
  try {
    if (AnalyticsEvent.db?.readyState !== 1) {
      return null;
    }

    let eventType, userId, metadata, ip, userAgent;
    if (firstArg && typeof firstArg === 'object' && firstArg.eventType) {
      ({ eventType, userId = null, metadata = {}, ip = null, userAgent = null } = firstArg);
    } else {
      userId = firstArg || null;
      eventType = secondArg;
      metadata = thirdArg || {};
      if (fourthArg && typeof fourthArg === 'object') {
        ip = fourthArg.ip || fourthArg.headers?.['x-forwarded-for'] || null;
        userAgent = fourthArg.headers?.['user-agent'] || null;
      }
    }

    const safeMeta = sanitizeMetadata(metadata);
    const entry = await AnalyticsEvent.create({
      eventType,
      userId: userId || null,
      metadata: safeMeta,
      ip: ip ? String(ip).substring(0, 45) : null,
      userAgent: userAgent ? String(userAgent).substring(0, 200) : null,
      timestamp: new Date(),
    });

    return entry;
  } catch (err) {
    // Non-blocking: analytics logging failure must never crash user request
    console.warn('⚠️ [Analytics Warning] Failed to log event:', err.message);
    return null;
  }
};

/**
 * Computes event-based product telemetry and unique-user interactions
 */
export const getEventAnalytics = async (days = 30) => {
  if (AnalyticsEvent.db?.readyState !== 1) {
    return [];
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const eventStats = await AnalyticsEvent.aggregate([
      {
        $match: {
          timestamp: { $gte: cutoffDate },
          'metadata.isDemo': { $ne: true },
        },
      },
      {
        $group: {
          _id: '$eventType',
          totalEvents: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' },
        },
      },
      {
        $project: {
          eventType: '$_id',
          totalEvents: 1,
          uniqueUsersCount: {
            $size: {
              $filter: {
                input: '$uniqueUsers',
                as: 'u',
                cond: { $ne: ['$$u', null] },
              },
            },
          },
          uniqueUsers: {
            $size: {
              $filter: {
                input: '$uniqueUsers',
                as: 'u',
                cond: { $ne: ['$$u', null] },
              },
            },
          },
          firstSeen: 1,
          lastSeen: 1,
          _id: 0,
        },
      },
      { $sort: { totalEvents: -1 } },
    ]);

    return eventStats;
  } catch (err) {
    console.warn('⚠️ [Analytics Warning] getEventAnalytics error:', err.message);
    return [];
  }
};

/**
 * Computes high-level operational insights across core features
 */
export const getOperationalInsights = async () => {
  const realUserFilter = {
    isDemo: { $ne: true },
    email: { $ne: DEMO_EMAIL },
  };

  if (User.db?.readyState !== 1) {
    return {
      users: { totalRealUsers: 0, onboardingCompletionRate: 0, profileSetupRate: 0 },
      exchanges: { totalRequests: 0, acceptedCount: 0, acceptanceRate: 0 },
      sessions: { scheduledCount: 0, completedCount: 0, completionRate: 0 },
      challenges: { totalChallenges: 0, participationsCount: 0, completedCount: 0 },
      workspaces: { totalWorkspaces: 0 },
      feedback: { totalFeedback: 0, avgRating: 5.0 },
    };
  }

  try {
    const [
      totalUsers,
      onboardedUsers,
      profileCompleteUsers,
      totalRequests,
      acceptedRequests,
      scheduledSessions,
      completedSessions,
      totalChallenges,
      challengeParticipations,
      completedChallenges,
      totalWorkspaces,
      feedbackStats,
    ] = await Promise.all([
      User.countDocuments(realUserFilter),
      User.countDocuments({ ...realUserFilter, onboardingCompletedAt: { $ne: null } }),
      User.countDocuments({
        ...realUserFilter,
        $and: [
          { 'skills.0': { $exists: true } },
          { 'learningInterests.0': { $exists: true } },
        ],
      }),
      ExchangeRequest.countDocuments({ isDemo: { $ne: true } }),
      ExchangeRequest.countDocuments({ isDemo: { $ne: true }, status: 'ACCEPTED' }),
      Session.countDocuments({ isDemo: { $ne: true }, status: 'SCHEDULED' }),
      Session.countDocuments({ isDemo: { $ne: true }, status: 'COMPLETED' }),
      Challenge.countDocuments({ isDemo: { $ne: true } }),
      ChallengeParticipation.countDocuments({ isDemo: { $ne: true } }),
      ChallengeParticipation.countDocuments({ isDemo: { $ne: true }, status: 'COMPLETED' }),
      Workspace.countDocuments({ isDemo: { $ne: true } }),
      Feedback.aggregate([
        { $match: { isDemo: { $ne: true } } },
        { $group: { _id: null, total: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const fb = feedbackStats[0] || { total: 0, avgRating: 5.0 };
    const baseUsers = totalUsers || 1;
    const baseRequests = totalRequests || 1;
    const totalSessionAttempts = scheduledSessions + completedSessions || 1;
    const onboardingRate = Math.round((onboardedUsers / baseUsers) * 100);
    const profileSetupRate = Math.round((profileCompleteUsers / baseUsers) * 100);
    const sessionCompletionRate = Math.round((completedSessions / totalSessionAttempts) * 100);
    const exchangeAcceptanceRate = Math.round((acceptedRequests / baseRequests) * 100);

    return {
      onboardingRate,
      profileSetupRate,
      sessionCompletionRate,
      exchangeAcceptanceRate,
      users: {
        totalRealUsers: totalUsers,
        onboardedCount: onboardedUsers,
        onboardingCompletionRate: onboardingRate,
        profileCompleteCount: profileCompleteUsers,
        profileSetupRate,
      },
      exchanges: {
        totalRequests,
        acceptedCount: acceptedRequests,
        acceptanceRate: exchangeAcceptanceRate,
      },
      sessions: {
        scheduledCount: scheduledSessions,
        completedCount: completedSessions,
        completionRate: sessionCompletionRate,
      },
      challenges: {
        totalChallenges,
        participationsCount: challengeParticipations,
        completedCount: completedChallenges,
      },
      workspaces: {
        totalWorkspaces,
      },
      feedback: {
        totalFeedback: fb.total,
        avgRating: Math.round((fb.avgRating || 5.0) * 10) / 10,
      },
    };
  } catch (err) {
    console.warn('⚠️ [Analytics Warning] getOperationalInsights error:', err.message);
    return {
      onboardingRate: 0,
      profileSetupRate: 0,
      sessionCompletionRate: 0,
      exchangeAcceptanceRate: 0,
      users: { totalRealUsers: 0, onboardingCompletionRate: 0, profileSetupRate: 0 },
      exchanges: { totalRequests: 0, acceptedCount: 0, acceptanceRate: 0 },
      sessions: { scheduledCount: 0, completedCount: 0, completionRate: 0 },
      challenges: { totalChallenges: 0, participationsCount: 0, completedCount: 0 },
      workspaces: { totalWorkspaces: 0 },
      feedback: { totalFeedback: 0, avgRating: 5.0 },
    };
  }
};

/**
 * Computes platform analytics, time-series growth, and feature adoption
 */
export const getPlatformAnalytics = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const realUserFilter = {
    isDemo: { $ne: true },
    email: { $ne: DEMO_EMAIL },
  };

  let registrationGrowth = [];
  let sessionStatusDistribution = [];
  let featureAdoption = [];
  let activeUsersCount = 0;

  if (User.db?.readyState === 1) {
    try {
      registrationGrowth = await User.aggregate([
        {
          $match: {
            ...realUserFilter,
            createdAt: { $gte: cutoffDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            count: 1,
            _id: 0,
          },
        },
      ]);
    } catch (e) {
      console.warn('Aggregation error (registrationGrowth):', e.message);
    }

    try {
      sessionStatusDistribution = await Session.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0,
          },
        },
      ]);
    } catch (e) {
      console.warn('Aggregation error (sessionStatus):', e.message);
    }

    try {
      activeUsersCount = await User.countDocuments({
        ...realUserFilter,
        $or: [
          { lastActiveAt: { $gte: cutoffDate } },
          { updatedAt: { $gte: cutoffDate } },
        ],
      });
    } catch (e) {
      activeUsersCount = 0;
    }
  }

  try {
    const [goalsCount, roadmapsCount, sessionsCount, circlesCount, feedbackCount, challengesCount, workspacesCount] = await Promise.all([
      Goal.countDocuments({ isDemo: { $ne: true } }),
      Roadmap.countDocuments({ isDemo: { $ne: true } }),
      Session.countDocuments({ isDemo: { $ne: true } }),
      Circle.countDocuments({ isDemo: { $ne: true } }),
      Feedback.countDocuments({ isDemo: { $ne: true } }),
      Challenge.countDocuments({ isDemo: { $ne: true } }),
      Workspace.countDocuments({ isDemo: { $ne: true } }),
    ]);

    featureAdoption = [
      { feature: 'Competency Goals', count: goalsCount },
      { feature: 'AI Roadmaps', count: roadmapsCount },
      { feature: 'Peer Sessions', count: sessionsCount },
      { feature: 'Learning Circles', count: circlesCount },
      { feature: 'Community Challenges', count: challengesCount },
      { feature: 'Team Workspaces', count: workspacesCount },
      { feature: 'User Feedbacks', count: feedbackCount },
    ];
  } catch (e) {
    featureAdoption = [];
  }

  const [eventAnalytics, operationalInsights] = await Promise.all([
    getEventAnalytics(days),
    getOperationalInsights(),
  ]);

  return {
    days,
    registrationGrowth,
    sessionStatusDistribution,
    activeUsersCount,
    featureAdoption,
    eventAnalytics,
    operationalInsights,
  };
};

/**
 * Computes user onboarding and activation conversion funnel
 */
export const getConversionFunnel = async () => {
  const realUserFilter = {
    isDemo: { $ne: true },
    email: { $ne: DEMO_EMAIL },
  };

  if (User.db?.readyState !== 1) {
    return [
      { step: 'Signups Started', count: 0, conversionRate: 100 },
      { step: 'Email Verified', count: 0, conversionRate: 0 },
      { step: 'Goal Created', count: 0, conversionRate: 0 },
      { step: 'Roadmap Generated', count: 0, conversionRate: 0 },
      { step: 'Session Scheduled', count: 0, conversionRate: 0 },
    ];
  }

  const [totalSignups, verifiedUsers, usersWithGoal, usersWithRoadmap, usersWithSession] =
    await Promise.all([
      User.countDocuments(realUserFilter),
      User.countDocuments({ ...realUserFilter, emailVerified: true }),
      Goal.distinct('user', { isDemo: { $ne: true } }).then((res) => res.length),
      Roadmap.distinct('user', { isDemo: { $ne: true } }).then((res) => res.length),
      Session.distinct('host', { isDemo: { $ne: true } }).then((res) => res.length),
    ]);

  const base = totalSignups || 1;

  return [
    { step: '1. Registered Users', count: totalSignups, conversionRate: 100 },
    {
      step: '2. Email Verified',
      count: verifiedUsers,
      conversionRate: Math.round((verifiedUsers / base) * 100),
    },
    {
      step: '3. Created Goal',
      count: usersWithGoal,
      conversionRate: Math.round((usersWithGoal / base) * 100),
    },
    {
      step: '4. Generated Roadmap',
      count: usersWithRoadmap,
      conversionRate: Math.round((usersWithRoadmap / base) * 100),
    },
    {
      step: '5. Scheduled Session',
      count: usersWithSession,
      conversionRate: Math.round((usersWithSession / base) * 100),
    },
  ];
};

export default {
  recordEvent,
  getEventAnalytics,
  getOperationalInsights,
  getPlatformAnalytics,
  getConversionFunnel,
};
