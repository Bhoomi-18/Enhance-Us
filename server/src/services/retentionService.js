import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Roadmap from '../models/roadmapModel.js';
import Session from '../models/sessionModel.js';
import Review from '../models/reviewModel.js';
import Circle from '../models/circleModel.js';
import ExchangeRequest from '../models/exchangeRequestModel.js';
import * as demoWorkspaceService from './demoWorkspaceService.js';
import { ApiError } from '../utils/apiError.js';

/**
 * Derives personalized Next-Best Actions, Unfinished Learning Continuity,
 * Chronological Activity Timeline, and Onboarding Status based strictly on
 * persisted, authorized user data.
 */
export const getDashboardFeed = async ({ userId, isDemo, workspaceId }) => {
  // Demo Mode Sandbox Isolation
  if (isDemo && workspaceId) {
    return await demoWorkspaceService.getDashboardFeed(workspaceId);
  }

  // Handle Mock DB / Offline Mode fallback
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return getMockDashboardFeed(userId);
  }

  const user = await User.findById(userId).select('-password');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Concurrent, non-blocking queries across persisted records
  const [
    goals,
    roadmaps,
    sessions,
    reviewsReceived,
    reviewsGiven,
    circlesJoined,
    pendingRequests,
  ] = await Promise.all([
    Goal.find({ user: userId }).sort({ updatedAt: -1 }),
    Roadmap.find({ user: userId }),
    Session.find({
      $or: [{ participants: userId }, { host: userId }],
    }).sort({ date: -1, createdAt: -1 }),
    Review.find({ $or: [{ reviewee: userId }, { recipient: userId }] }).sort({ createdAt: -1 }).limit(10),
    Review.find({ reviewer: userId }).select('session reviewee recipient'),
    Circle.find({
      $or: [{ 'members.user': userId }, { creator: userId }],
    }).limit(5),
    ExchangeRequest.find({ recipient: userId, status: 'PENDING' }),
  ]);

  // Map roadmaps by goal ID for quick lookup
  const roadmapByGoalId = new Map();
  roadmaps.forEach((r) => {
    if (r.goal) roadmapByGoalId.set(r.goal.toString(), r);
  });

  // Reviewed session IDs set to detect pending reviews
  const reviewedSessionIds = new Set(
    reviewsGiven.filter((r) => r.session).map((r) => r.session.toString())
  );

  // 1. DERIVE NEXT-BEST ACTIONS (DETERMINISTIC, PRIORITIZED)
  const nextBestActions = [];

  // Action 1: Pending Peer Review (HIGH PRIORITY)
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const sessionNeedingReview = completedSessions.find(
    (s) => !reviewedSessionIds.has(s._id.toString())
  );
  if (sessionNeedingReview) {
    nextBestActions.push({
      id: `review_${sessionNeedingReview._id}`,
      type: 'PENDING_REVIEW',
      priority: 'HIGH',
      title: `Leave Peer Review for ${sessionNeedingReview.skillTaught || 'Session'}`,
      description: 'Your peer has completed this exchange session with you. Share constructive feedback to help build their verified proof-of-skill.',
      link: '/sessions',
      actionLabel: 'Leave Review',
      icon: 'Star',
      reason: 'Exchange session completed recently',
    });
  }

  // Action 2: Upcoming Scheduled Session (HIGH PRIORITY)
  const scheduledSessions = sessions.filter((s) => s.status === 'SCHEDULED');
  if (scheduledSessions.length > 0) {
    const nextSession = scheduledSessions[0];
    const sessionDateStr = nextSession.date ? new Date(nextSession.date).toLocaleDateString() : '';
    nextBestActions.push({
      id: `upcoming_session_${nextSession._id}`,
      type: 'UPCOMING_SESSION',
      priority: 'HIGH',
      title: `Prepare for: ${nextSession.skillTaught || 'Exchange Session'}`,
      description: `Scheduled for ${sessionDateStr} at ${nextSession.time || 'TBD'}. Review meeting details and session notes.`,
      link: '/sessions',
      actionLabel: 'View Session',
      icon: 'Calendar',
      reason: 'Upcoming session on your calendar',
    });
  }

  // Action 3: Pending Incoming Exchange Request (MEDIUM PRIORITY)
  if (pendingRequests.length > 0) {
    const req = pendingRequests[0];
    nextBestActions.push({
      id: `request_${req._id}`,
      type: 'PENDING_REQUEST',
      priority: 'HIGH',
      title: 'Respond to Peer Exchange Request',
      description: 'A peer has requested a reciprocal skill exchange with you. Accept to start learning together.',
      link: '/matches',
      actionLabel: 'Review Request',
      icon: 'UserCheck',
      reason: 'Pending incoming exchange proposal',
    });
  }

  // Action 4: Resume / Continue Active Learning Goal (MEDIUM PRIORITY)
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const pausedGoals = goals.filter((g) => g.status === 'PAUSED');
  const relevantGoal = activeGoals[0] || pausedGoals[0];

  if (relevantGoal) {
    const relatedRoadmap = roadmapByGoalId.get(relevantGoal._id.toString());
    let nextMilestoneTitle = 'Next Milestone';
    let link = `/goals/${relevantGoal._id}`;

    if (relatedRoadmap && Array.isArray(relatedRoadmap.milestones)) {
      const nextMs = relatedRoadmap.milestones.find((m) => m.status !== 'COMPLETED');
      if (nextMs) {
        nextMilestoneTitle = nextMs.title;
        link = `/roadmaps/${relatedRoadmap._id}`;
      }
    }

    const isPaused = relevantGoal.status === 'PAUSED';
    nextBestActions.push({
      id: `continue_goal_${relevantGoal._id}`,
      type: isPaused ? 'RESUME_GOAL' : 'CONTINUE_GOAL',
      priority: 'MEDIUM',
      title: isPaused ? `Resume Goal: ${relevantGoal.title}` : `Continue Goal: ${relevantGoal.title}`,
      description: `Target step: ${nextMilestoneTitle}. Current progress: ${relevantGoal.progress || 0}%.`,
      link,
      actionLabel: isPaused ? 'Resume Learning' : 'Continue Learning',
      icon: 'Target',
      reason: isPaused ? 'Goal is currently paused' : 'Active goal in progress',
    });
  }

  // Action 5: Skill Gap Partner Needed (MEDIUM PRIORITY)
  if (relevantGoal && relevantGoal.skillGaps?.missingSkills?.length > 0) {
    const missing = relevantGoal.skillGaps.missingSkills[0];
    nextBestActions.push({
      id: `match_gap_${missing.name || 'skill'}`,
      type: 'FIND_PARTNER',
      priority: 'MEDIUM',
      title: `Find Partner for ${missing.name}`,
      description: `Identified as a critical skill gap in your "${relevantGoal.title}" blueprint. Connect with a peer who can teach it.`,
      link: '/matches',
      actionLabel: 'Discover Matches',
      icon: 'Zap',
      reason: `Required for "${relevantGoal.title}"`,
    });
  }

  // Action 6: Explore Learning Circles (LOW PRIORITY)
  if (circlesJoined.length === 0) {
    nextBestActions.push({
      id: 'explore_circles',
      type: 'EXPLORE_CIRCLES',
      priority: 'LOW',
      title: 'Join a Learning Circle',
      description: 'Collaborate with peer communities sharing your tech stack or design goals.',
      link: '/circles',
      actionLabel: 'Explore Circles',
      icon: 'Users',
      reason: 'Expand your peer network',
    });
  }

  // Action 7: Complete Teaching Skills on Profile (LOW PRIORITY)
  const hasTeachingSkill = (user.skills || []).some(
    (s) => s.type === 'TEACH' || s.type === 'both'
  );
  if (!hasTeachingSkill) {
    nextBestActions.push({
      id: 'complete_teaching_skills',
      type: 'COMPLETE_PROFILE',
      priority: 'LOW',
      title: 'Add Skills You Can Teach',
      description: 'List at least one skill you can share with peers to unlock reciprocal skill matching.',
      link: '/profile',
      actionLabel: 'Update Profile',
      icon: 'Sparkles',
      reason: 'Reciprocal matching requires offering skills',
    });
  }

  // Cap to top 4 most actionable items
  const prioritizedActions = nextBestActions.slice(0, 4);

  // 2. UNFINISHED LEARNING & CONTINUITY
  let unfinishedLearning = null;
  if (relevantGoal) {
    const relatedRoadmap = roadmapByGoalId.get(relevantGoal._id.toString());
    let currentMilestone = null;
    let completedMilestones = 0;
    let totalMilestones = 0;

    if (relatedRoadmap && Array.isArray(relatedRoadmap.milestones)) {
      totalMilestones = relatedRoadmap.milestones.length;
      completedMilestones = relatedRoadmap.milestones.filter(
        (m) => m.status === 'COMPLETED'
      ).length;
      currentMilestone = relatedRoadmap.milestones.find(
        (m) => m.status !== 'COMPLETED'
      ) || null;
    }

    unfinishedLearning = {
      goalId: relevantGoal._id,
      title: relevantGoal.title,
      description: relevantGoal.description,
      status: relevantGoal.status, // ACTIVE or PAUSED
      progress: relevantGoal.progress || 0,
      totalMilestones,
      completedMilestones,
      currentMilestoneTitle: currentMilestone?.title || 'Next milestone',
      currentMilestoneSkill: currentMilestone?.skillName || '',
      roadmapId: relatedRoadmap?._id || null,
      continueLink: relatedRoadmap ? `/roadmaps/${relatedRoadmap._id}` : `/goals/${relevantGoal._id}`,
    };
  }

  // 3. PERSONALIZED ACTIVITY TIMELINE (GENUINE PERSISTED EVENTS)
  const rawTimelineEvents = [];

  // Goal events
  goals.forEach((g) => {
    if (g.createdAt) {
      rawTimelineEvents.push({
        id: `goal_created_${g._id}`,
        type: 'GOAL_CREATED',
        title: `Created goal blueprint "${g.title}"`,
        subtitle: `${g.requiredSkills?.length || 0} skills analyzed`,
        timestamp: new Date(g.createdAt).toISOString(),
        link: `/goals/${g._id}`,
        icon: 'Target',
      });
    }
    if (g.status === 'COMPLETED' && g.updatedAt) {
      rawTimelineEvents.push({
        id: `goal_completed_${g._id}`,
        type: 'GOAL_COMPLETED',
        title: `Completed goal blueprint "${g.title}"`,
        subtitle: '100% skill milestones satisfied',
        timestamp: new Date(g.updatedAt).toISOString(),
        link: `/goals/${g._id}`,
        icon: 'CheckCircle2',
      });
    }
  });

  // Milestone events
  roadmaps.forEach((r) => {
    if (Array.isArray(r.milestones)) {
      r.milestones.forEach((m) => {
        if (m.completedAt) {
          rawTimelineEvents.push({
            id: `milestone_${m.milestoneId || m.title}_${r._id}`,
            type: 'MILESTONE_COMPLETED',
            title: `Completed milestone: "${m.title}"`,
            subtitle: `Skill: ${m.skillName || 'General'}`,
            timestamp: new Date(m.completedAt).toISOString(),
            link: `/roadmaps/${r._id}`,
            icon: 'Award',
          });
        }
      });
    }
  });

  // Session events
  sessions.forEach((s) => {
    if (s.status === 'COMPLETED') {
      rawTimelineEvents.push({
        id: `session_completed_${s._id}`,
        type: 'SESSION_COMPLETED',
        title: `Completed learning session on "${s.skillTaught}"`,
        subtitle: `${s.durationMinutes || 60} min peer exchange`,
        timestamp: new Date(s.date || s.updatedAt || s.createdAt).toISOString(),
        link: '/sessions',
        icon: 'Clock',
      });
    } else if (s.status === 'SCHEDULED') {
      rawTimelineEvents.push({
        id: `session_sched_${s._id}`,
        type: 'SESSION_SCHEDULED',
        title: `Scheduled exchange session on "${s.skillTaught}"`,
        subtitle: `${new Date(s.date).toLocaleDateString()} at ${s.time || ''}`,
        timestamp: new Date(s.createdAt || s.date).toISOString(),
        link: '/sessions',
        icon: 'Calendar',
      });
    }
  });

  // Review events
  reviewsReceived.forEach((rev) => {
    const rating = rev.overallRating || rev.rating || 5;
    const comment = rev.feedbackText || rev.comment || '';
    rawTimelineEvents.push({
      id: `review_rec_${rev._id}`,
      type: 'REVIEW_RECEIVED',
      title: `Received ${rating}★ peer review`,
      subtitle: comment ? `"${comment.substring(0, 70)}..."` : 'Verified exchange feedback',
      timestamp: new Date(rev.createdAt).toISOString(),
      link: '/profile',
      icon: 'Star',
    });
  });

  // Circle events
  circlesJoined.forEach((c) => {
    rawTimelineEvents.push({
      id: `circle_joined_${c._id}`,
      type: 'CIRCLE_JOINED',
      title: `Joined learning circle "${c.name}"`,
      subtitle: `${c.memberCount || c.members?.length || 1} members`,
      timestamp: new Date(c.createdAt).toISOString(),
      link: `/circles/${c._id}`,
      icon: 'Users',
    });
  });

  // Sort strictly by timestamp descending, limit to 10
  rawTimelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const activityTimeline = rawTimelineEvents.slice(0, 10);

  // 4. ONBOARDING STATUS
  const hasSkills = (user.skills || []).length > 0;
  const hasGoal = goals.length > 0;
  const hasPartnerOrSession = sessions.length > 0 || circlesJoined.length > 0;

  const onboardingSteps = [
    {
      id: 'offer_skill',
      label: 'Offer a skill you can teach',
      completed: hasSkills,
      link: '/profile',
      actionText: 'Add Skill',
    },
    {
      id: 'create_goal',
      label: 'Define your first learning goal',
      completed: hasGoal,
      link: '/goals',
      actionText: 'Create Goal',
    },
    {
      id: 'connect_peer',
      label: 'Find a peer partner or join a circle',
      completed: hasPartnerOrSession,
      link: '/matches',
      actionText: 'Discover Peers',
    },
  ];

  const allStepsComplete = onboardingSteps.every((s) => s.completed);
  const isCompleted = Boolean(user.onboardingCompletedAt) || allStepsComplete;

  const onboarding = {
    isCompleted,
    completedAt: user.onboardingCompletedAt || (allStepsComplete ? user.updatedAt : null),
    dismissedAt: user.dismissedOnboardingAt,
    steps: onboardingSteps,
  };

  // 5. RESPECTFUL RETURN SUMMARY
  const firstName = user.name ? user.name.split(' ')[0] : 'Learner';
  let returnGreeting = `Welcome back, ${firstName}!`;
  let returnMessage = 'Pick up right where you left off in your learning journey.';

  if (relevantGoal) {
    returnMessage = `You are making steady progress on "${relevantGoal.title}".`;
  } else if (!hasGoal) {
    returnGreeting = `Welcome to EnhanceUs, ${firstName}!`;
    returnMessage = 'Create your first goal blueprint to receive an AI skill gap breakdown and peer recommendations.';
  }

  const returnSummary = {
    greeting: returnGreeting,
    message: returnMessage,
    hasActiveGoal: Boolean(relevantGoal),
    activeGoalTitle: relevantGoal ? relevantGoal.title : null,
    activeGoalProgress: relevantGoal ? relevantGoal.progress : 0,
    continueLink: unfinishedLearning ? unfinishedLearning.continueLink : '/goals',
  };

  // 6. METRICS OVERVIEW
  const totalGoals = goals.length;
  const activeGoalsCount = activeGoals.length;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / totalGoals) : 0;
  const totalGaps = goals.reduce((acc, g) => acc + (g.skillGaps?.missingSkills?.length || 0), 0);

  return {
    nextBestActions: prioritizedActions,
    unfinishedLearning,
    activityTimeline,
    onboarding,
    returnSummary,
    metrics: {
      totalGoals,
      activeGoals: activeGoalsCount,
      avgProgress,
      totalGaps,
      sessionsCompleted: user.sessionsCompleted || completedSessions.length,
    },
  };
};

/**
 * Fallback feed for offline / Mock DB testing
 */
const getMockDashboardFeed = (userId) => {
  return {
    nextBestActions: [
      {
        id: 'mock_action_1',
        type: 'CONTINUE_GOAL',
        priority: 'MEDIUM',
        title: 'Continue Goal: AI SaaS Application',
        description: 'Target step: Design Core Schemas & Authentication. Progress: 45%.',
        link: '/goals',
        actionLabel: 'Continue Learning',
        icon: 'Target',
        reason: 'Active goal in progress',
      },
    ],
    unfinishedLearning: {
      goalId: 'mock_goal_1',
      title: 'AI SaaS Application',
      description: 'Build a production SaaS application.',
      status: 'ACTIVE',
      progress: 45,
      totalMilestones: 4,
      completedMilestones: 2,
      currentMilestoneTitle: 'Design Core Schemas & Authentication',
      currentMilestoneSkill: 'Node.js',
      roadmapId: 'mock_roadmap_1',
      continueLink: '/goals',
    },
    activityTimeline: [
      {
        id: 'mock_timeline_1',
        type: 'GOAL_CREATED',
        title: 'Created goal blueprint "AI SaaS Application"',
        subtitle: '3 skills analyzed',
        timestamp: new Date().toISOString(),
        link: '/goals',
        icon: 'Target',
      },
    ],
    onboarding: {
      isCompleted: true,
      completedAt: new Date().toISOString(),
      dismissedAt: null,
      steps: [
        { id: 'offer_skill', label: 'Offer a skill you can teach', completed: true, link: '/profile', actionText: 'Add Skill' },
        { id: 'create_goal', label: 'Define your first learning goal', completed: true, link: '/goals', actionText: 'Create Goal' },
        { id: 'connect_peer', label: 'Find a peer partner or join a circle', completed: true, link: '/matches', actionText: 'Discover Peers' },
      ],
    },
    returnSummary: {
      greeting: 'Welcome back, Alex!',
      message: 'You are making steady progress on "AI SaaS Application".',
      hasActiveGoal: true,
      activeGoalTitle: 'AI SaaS Application',
      activeGoalProgress: 45,
      continueLink: '/goals',
    },
    metrics: {
      totalGoals: 1,
      activeGoals: 1,
      avgProgress: 45,
      totalGaps: 2,
      sessionsCompleted: 4,
    },
  };
};
