import AnalyticsEvent from '../models/analyticsEventModel.js';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';
import Goal from '../models/goalModel.js';
import Roadmap from '../models/roadmapModel.js';
import Feedback from '../models/feedbackModel.js';
import Circle from '../models/circleModel.js';
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
export const recordEvent = async ({
  eventType,
  userId = null,
  metadata = {},
  ip = null,
  userAgent = null,
}) => {
  try {
    if (AnalyticsEvent.db?.readyState !== 1) {
      return null;
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
 * Computes platform analytics, time-series growth, and feature adoption
 */
export const getPlatformAnalytics = async (days = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // 1. User Registration Growth Buckets (Daily)
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

    // 2. Session Distribution by Status
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

    // 3. Active Users Count (within timeframe)
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

  // 4. Feature Adoption Counts (excluding demo accounts/workspaces)
  try {
    const [goalsCount, roadmapsCount, sessionsCount, circlesCount, feedbackCount] = await Promise.all([
      Goal.countDocuments({ isDemo: { $ne: true } }),
      Roadmap.countDocuments({ isDemo: { $ne: true } }),
      Session.countDocuments({ isDemo: { $ne: true } }),
      Circle.countDocuments({ isDemo: { $ne: true } }),
      Feedback.countDocuments({ isDemo: { $ne: true } }),
    ]);

    featureAdoption = [
      { feature: 'Competency Goals', count: goalsCount },
      { feature: 'AI Roadmaps', count: roadmapsCount },
      { feature: 'Peer Sessions', count: sessionsCount },
      { feature: 'Learning Circles', count: circlesCount },
      { feature: 'User Feedbacks', count: feedbackCount },
    ];
  } catch (e) {
    featureAdoption = [];
  }

  return {
    days,
    registrationGrowth,
    sessionStatusDistribution,
    activeUsersCount,
    featureAdoption,
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
  getPlatformAnalytics,
  getConversionFunnel,
};
