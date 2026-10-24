import crypto from 'crypto';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { getCanonicalBaseline, BASELINE_VERSION, DEMO_USER_ID } from '../fixtures/canonicalDemoBaseline.js';
import { ApiError } from '../utils/apiError.js';
import calculateSkillGaps from './skillGapEngine.js';

// In-Memory store for offline testing or when MongoDB is disconnected
export const mockWorkspacesMap = new Map();

/**
 * Creates or retrieves an existing demo workspace for a given workspaceId.
 * Guarantees that every visitor receives an isolated copy of the canonical baseline.
 */
export const getOrCreateWorkspace = async (workspaceId, userId = DEMO_USER_ID) => {
  if (!workspaceId) {
    throw new ApiError(400, 'Workspace ID is required for demo operations');
  }

  // 1. Offline / Mock DB Mode fallback
  if (process.env.MOCK_DB === 'true' && DemoWorkspace.db?.readyState !== 1) {
    if (!mockWorkspacesMap.has(workspaceId)) {
      const initialData = getCanonicalBaseline();
      mockWorkspacesMap.set(workspaceId, {
        workspaceId,
        version: BASELINE_VERSION,
        userId,
        tourDismissed: false,
        data: initialData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return mockWorkspacesMap.get(workspaceId);
  }

  // 2. MongoDB Connected Mode
  try {
    let ws = await DemoWorkspace.findOne({ workspaceId });
    if (!ws) {
      const initialData = getCanonicalBaseline();
      ws = await DemoWorkspace.create({
        workspaceId,
        version: BASELINE_VERSION,
        userId,
        tourDismissed: false,
        data: initialData,
      });
    }
    return ws;
  } catch (err) {
    console.error('⚠️ [DemoWorkspace Error] DB lookup failed, falling back to memory:', err.message);
    if (!mockWorkspacesMap.has(workspaceId)) {
      mockWorkspacesMap.set(workspaceId, {
        workspaceId,
        version: BASELINE_VERSION,
        userId,
        tourDismissed: false,
        data: getCanonicalBaseline(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return mockWorkspacesMap.get(workspaceId);
  }
};

/**
 * Persists mutations back to the isolated workspace record.
 */
export const saveWorkspace = async (workspace) => {
  workspace.updatedAt = new Date();

  if (process.env.MOCK_DB === 'true' && DemoWorkspace.db?.readyState !== 1) {
    mockWorkspacesMap.set(workspace.workspaceId, workspace);
    return workspace;
  }

  if (typeof workspace.save === 'function') {
    workspace.markModified('data');
    await workspace.save();
    return workspace;
  }

  // If plain object
  await DemoWorkspace.findOneAndUpdate(
    { workspaceId: workspace.workspaceId },
    { $set: { data: workspace.data, tourDismissed: workspace.tourDismissed, updatedAt: new Date() } },
    { upsert: true }
  );
  return workspace;
};

/**
 * Resets a visitor's workspace back to the canonical baseline.
 * Requires explicit confirmation. Other visitors and real users remain untouched.
 */
export const resetWorkspace = async (workspaceId, confirm = false) => {
  if (!confirm) {
    throw new ApiError(400, 'Explicit confirmation ({ confirm: true }) is required to reset demo workspace');
  }

  const workspace = await getOrCreateWorkspace(workspaceId);
  workspace.data = getCanonicalBaseline();
  workspace.version = BASELINE_VERSION;
  workspace.tourDismissed = false;

  await saveWorkspace(workspace);

  return {
    success: true,
    message: 'Demo workspace successfully restored to canonical baseline.',
    version: BASELINE_VERSION,
    restoredAt: new Date().toISOString(),
  };
};

/* ==========================================================================
 * PROFILE & SKILLS
 * ========================================================================== */

export const getProfile = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.profile;
};

export const updateProfile = async (workspaceId, updateData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const p = ws.data.profile;

  const allowedFields = [
    'name', 'bio', 'avatar', 'availability', 'timezone',
    'experienceLevel', 'preferredLearningStyle', 'skills', 'learningInterests'
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      p[field] = updateData[field];
    }
  }

  await saveWorkspace(ws);
  return p;
};

/* ==========================================================================
 * GOALS & SKILL GAPS
 * ========================================================================== */

export const getGoals = async (workspaceId, statusFilter) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  let goals = ws.data.goals || [];
  if (statusFilter) {
    goals = goals.filter((g) => g.status === statusFilter);
  }
  return goals;
};

export const getGoal = async (workspaceId, goalId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goal = (ws.data.goals || []).find((g) => g._id === goalId);
  if (!goal) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }
  return goal;
};

export const previewGoalAnalysis = async (workspaceId, { title, description }) => {
  if (!description || typeof description !== 'string' || !description.trim()) {
    throw new ApiError(400, 'Goal description is required for analysis');
  }

  const ws = await getOrCreateWorkspace(workspaceId);
  const profileSkills = (ws.data.profile?.skills || []).map((s) => ({
    name: s.name,
    category: s.category || 'General',
    level: (s.level || 'INTERMEDIATE').toUpperCase(),
  }));

  // Deterministic decomposition for preview
  const requiredSkills = [
    { name: 'React', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH' },
    { name: 'TypeScript', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH' },
    { name: 'UI/UX Design', category: 'Design', level: 'INTERMEDIATE', importance: 'HIGH' },
  ];

  const gaps = calculateSkillGaps(profileSkills, requiredSkills);

  return {
    title: (title || '').trim(),
    description: description.trim(),
    requiredSkills,
    aiAnalysis: {
      domain: 'Full-Stack Web Application',
      feasibility: 'High',
      estimatedWeeks: 6,
    },
    userSkillsSnapshot: profileSkills,
    skillGaps: gaps,
    progress: gaps.progress,
  };
};

export const createGoal = async (workspaceId, goalData) => {
  const { title, description, status } = goalData;
  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required to create a goal');
  }

  const ws = await getOrCreateWorkspace(workspaceId);
  const profileSkills = (ws.data.profile?.skills || []).map((s) => ({
    name: s.name,
    category: s.category || 'General',
    level: (s.level || 'INTERMEDIATE').toUpperCase(),
  }));

  const requiredSkills = [
    { name: 'React', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH' },
    { name: 'TypeScript', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH' },
    { name: 'UI/UX Design', category: 'Design', level: 'INTERMEDIATE', importance: 'HIGH' },
  ];

  const gaps = calculateSkillGaps(profileSkills, requiredSkills);

  const newGoal = {
    _id: 'demo_goal_' + Date.now(),
    user: DEMO_USER_ID,
    title: title.trim(),
    description: description.trim(),
    status: status || 'ACTIVE',
    requiredSkills,
    userSkillsSnapshot: profileSkills,
    skillGaps: gaps,
    progress: gaps.progress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ws.data.goals = ws.data.goals || [];
  ws.data.goals.unshift(newGoal);

  await saveWorkspace(ws);
  return newGoal;
};

export const updateGoal = async (workspaceId, goalId, updateData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goalIndex = (ws.data.goals || []).findIndex((g) => g._id === goalId);
  if (goalIndex === -1) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  const goal = ws.data.goals[goalIndex];
  if (updateData.title) goal.title = updateData.title.trim();
  if (updateData.description) goal.description = updateData.description.trim();
  if (updateData.status) goal.status = updateData.status;
  if (updateData.progress !== undefined) goal.progress = Number(updateData.progress);
  goal.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return goal;
};

export const deleteGoal = async (workspaceId, goalId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const initialLength = (ws.data.goals || []).length;
  ws.data.goals = (ws.data.goals || []).filter((g) => g._id !== goalId);

  if (ws.data.goals.length === initialLength) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  await saveWorkspace(ws);
  return { success: true };
};

/* ==========================================================================
 * ROADMAPS & MILESTONES
 * ========================================================================== */

export const getUserRoadmaps = async (workspaceId, filters = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  let roadmaps = ws.data.roadmaps || [];
  if (filters.goalId) {
    roadmaps = roadmaps.filter((r) => r.goal === filters.goalId || r.goal?._id === filters.goalId);
  }
  if (filters.status) {
    roadmaps = roadmaps.filter((r) => r.status === filters.status.toUpperCase());
  }
  return roadmaps;
};

export const getRoadmapById = async (workspaceId, roadmapId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const roadmap = (ws.data.roadmaps || []).find((r) => r._id === roadmapId);
  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found in demo workspace');
  }
  return roadmap;
};

export const createRoadmap = async (workspaceId, goalId, options = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goal = (ws.data.goals || []).find((g) => g._id === goalId);
  if (!goal) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  const newRoadmap = {
    _id: 'demo_roadmap_' + Date.now(),
    user: DEMO_USER_ID,
    goal: goal._id,
    title: `Roadmap: ${goal.title}`,
    goalSummary: `Structured competency roadmap designed to build ${goal.title}.`,
    estimatedDuration: '6-8 weeks (approx. 5-7 hrs/week)',
    status: 'ACTIVE',
    progress: 0,
    skills: [
      { name: 'UI/UX Design', description: 'Design fundamentals', currentLevel: 'beginner', targetLevel: 'intermediate' },
      { name: 'TypeScript', description: 'Type safety patterns', currentLevel: 'intermediate', targetLevel: 'advanced' },
    ],
    milestones: [
      {
        _id: 'ms_' + Date.now() + '_1',
        title: 'Core Fundamentals & Architecture',
        description: 'Understand fundamentals and project setup.',
        status: 'IN_PROGRESS',
        targetSkill: 'TypeScript',
        estimatedHours: 10,
        order: 1,
        tasks: [
          { id: 't_1', title: 'Setup TypeScript and ESLint configs', completed: true },
          { id: 't_2', title: 'Define domain entity interfaces', completed: false },
        ],
        prerequisites: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ws.data.roadmaps = ws.data.roadmaps || [];
  ws.data.roadmaps.unshift(newRoadmap);

  await saveWorkspace(ws);
  return newRoadmap;
};

export const updateMilestoneStatus = async (workspaceId, roadmapId, milestoneId, { status, evidenceUrl, notes }) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const roadmap = (ws.data.roadmaps || []).find((r) => r._id === roadmapId);
  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found in demo workspace');
  }

  const milestone = (roadmap.milestones || []).find((m) => m._id === milestoneId);
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found in demo workspace');
  }

  milestone.status = status;
  if (evidenceUrl !== undefined) milestone.evidenceUrl = evidenceUrl;
  if (notes !== undefined) milestone.notes = notes;
  if (status === 'COMPLETED') {
    milestone.completedAt = new Date().toISOString();
  }

  // Recalculate roadmap progress
  const completedCount = roadmap.milestones.filter((m) => m.status === 'COMPLETED').length;
  roadmap.progress = Math.round((completedCount / roadmap.milestones.length) * 100);
  roadmap.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return { roadmap, milestone };
};

/* ==========================================================================
 * LEARNING CIRCLES
 * ========================================================================== */

export const getCircles = async (workspaceId, filters = {}, pagination = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  let circles = ws.data.circles || [];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    circles = circles.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.primarySkill.toLowerCase().includes(q)
    );
  }

  if (filters.skill) {
    circles = circles.filter((c) => c.primarySkill.toLowerCase() === filters.skill.toLowerCase());
  }

  if (filters.onlyMy) {
    circles = circles.filter((c) =>
      c.members?.some((m) => (m.user?._id || m.user).toString() === DEMO_USER_ID)
    );
  }

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 12));
  const total = circles.length;
  const paginated = circles.slice((page - 1) * limit, page * limit);

  return {
    circles: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getCircleById = async (workspaceId, circleId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const circle = (ws.data.circles || []).find((c) => c._id === circleId);
  if (!circle) {
    throw new ApiError(404, 'Learning circle not found in demo workspace');
  }
  return circle;
};

export const createCircle = async (workspaceId, circleData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const newCircle = {
    _id: 'demo_circle_' + Date.now(),
    title: circleData.title.trim(),
    description: circleData.description.trim(),
    primarySkill: circleData.primarySkill,
    skillLevel: circleData.skillLevel || 'ALL_LEVELS',
    membershipPolicy: circleData.membershipPolicy || 'OPEN',
    status: 'ACTIVE',
    creator: DEMO_USER_ID,
    memberCount: 1,
    members: [{ user: DEMO_USER_ID, role: 'LEADER', joinedAt: new Date().toISOString() }],
    learningObjectives: circleData.learningObjectives || ['Collaborative skill development'],
    meetingSchedule: circleData.meetingSchedule || { frequency: 'WEEKLY', dayOfWeek: 'Wednesday', timeUtc: '18:00' },
    createdAt: new Date().toISOString(),
  };

  ws.data.circles = ws.data.circles || [];
  ws.data.circles.unshift(newCircle);

  await saveWorkspace(ws);
  return newCircle;
};

export const joinCircle = async (workspaceId, circleId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const circle = (ws.data.circles || []).find((c) => c._id === circleId);
  if (!circle) {
    throw new ApiError(404, 'Circle not found in demo workspace');
  }

  const isMember = circle.members?.some((m) => (m.user?._id || m.user).toString() === DEMO_USER_ID);
  if (isMember) {
    throw new ApiError(400, 'You are already a member of this circle');
  }

  circle.members = circle.members || [];
  circle.members.push({ user: DEMO_USER_ID, role: 'MEMBER', joinedAt: new Date().toISOString() });
  circle.memberCount = circle.members.length;

  await saveWorkspace(ws);
  return circle;
};

export const leaveCircle = async (workspaceId, circleId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const circle = (ws.data.circles || []).find((c) => c._id === circleId);
  if (!circle) {
    throw new ApiError(404, 'Circle not found in demo workspace');
  }

  circle.members = (circle.members || []).filter(
    (m) => (m.user?._id || m.user).toString() !== DEMO_USER_ID
  );
  circle.memberCount = circle.members.length;

  await saveWorkspace(ws);
  return circle;
};

export const getCirclePosts = async (workspaceId, circleId, pagination = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const posts = (ws.data.circlePosts || []).filter((p) => p.circle === circleId);

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 20));

  return {
    posts: posts.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: posts.length,
      totalPages: Math.ceil(posts.length / limit) || 1,
    },
  };
};

export const createCirclePost = async (workspaceId, circleId, postData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const newPost = {
    _id: 'demo_post_' + Date.now(),
    circle: circleId,
    author: {
      _id: DEMO_USER_ID,
      name: ws.data.profile?.name || 'Alex Morgan',
      avatar: ws.data.profile?.avatar || '',
    },
    type: postData.type || 'DISCUSSION',
    title: postData.title ? postData.title.trim() : '',
    content: postData.content ? postData.content.trim() : '',
    likes: [],
    likeCount: 0,
    comments: [],
    createdAt: new Date().toISOString(),
  };

  ws.data.circlePosts = ws.data.circlePosts || [];
  ws.data.circlePosts.unshift(newPost);

  await saveWorkspace(ws);
  return newPost;
};

/* ==========================================================================
 * MATCHES
 * ========================================================================== */

export const getMatches = async (workspaceId, filters = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.matches || [];
};

export const getMatchById = async (workspaceId, matchId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const match = (ws.data.matches || []).find((m) => m._id === matchId);
  if (!match) {
    throw new ApiError(404, 'Match not found in demo workspace');
  }
  return match;
};

export const createExchangeRequest = async (workspaceId, requestData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const newRequest = {
    _id: 'demo_req_' + Date.now(),
    sender: DEMO_USER_ID,
    recipient: requestData.recipientId,
    goal: requestData.goalId,
    offeredSkill: requestData.offeredSkill,
    requestedSkill: requestData.requestedSkill,
    proposedExchange: requestData.proposedExchange || 'Looking forward to exchanging skills!',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  // Update match status to REQUESTED if present
  const match = (ws.data.matches || []).find((m) => (m.candidate?._id || m.candidate) === requestData.recipientId);
  if (match) {
    match.status = 'PENDING';
  }

  await saveWorkspace(ws);
  return newRequest;
};

export const getConnections = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.connections || [];
};

/* ==========================================================================
 * SESSIONS & REVIEWS
 * ========================================================================== */

export const getSessions = async (workspaceId, filters = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  let sessions = ws.data.sessions || [];
  if (filters.status) {
    sessions = sessions.filter((s) => s.status === filters.status);
  }
  return sessions;
};

export const getSessionById = async (workspaceId, sessionId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const session = (ws.data.sessions || []).find((s) => s._id === sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found in demo workspace');
  }
  return session;
};

export const createSession = async (workspaceId, sessionData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const peer = (ws.data.peers || []).find((p) => p._id === sessionData.recipientId) || ws.data.peers?.[0] || { _id: 'demo_peer_sarah_002', name: 'Sarah Chen' };

  const newSession = {
    _id: 'demo_session_' + Date.now(),
    goal: sessionData.goalId || 'demo_goal_saas_001',
    participants: [
      { _id: DEMO_USER_ID, name: ws.data.profile?.name || 'Alex Morgan', avatar: ws.data.profile?.avatar },
      { _id: peer._id, name: peer.name, avatar: peer.avatar },
    ],
    host: DEMO_USER_ID,
    date: sessionData.date || new Date().toISOString(),
    time: sessionData.time || '15:00',
    durationMinutes: Number(sessionData.durationMinutes) || 60,
    skillTaught: sessionData.skillTaught || 'React',
    sessionNotes: sessionData.sessionNotes || '',
    meetingUrl: 'https://meet.jit.si/enhanceus-demo-room-' + Date.now(),
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
  };

  ws.data.sessions = ws.data.sessions || [];
  ws.data.sessions.unshift(newSession);

  await saveWorkspace(ws);
  return newSession;
};

export const updateSessionStatus = async (workspaceId, sessionId, status) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const session = (ws.data.sessions || []).find((s) => s._id === sessionId);
  if (!session) {
    throw new ApiError(404, 'Session not found in demo workspace');
  }

  session.status = status;
  if (status === 'COMPLETED') {
    session.completedAt = new Date().toISOString();
    session.completedBy = [DEMO_USER_ID];
  }

  await saveWorkspace(ws);
  return session;
};

/* ==========================================================================
 * CONVERSATIONS & MESSAGES
 * ========================================================================== */

export const getConversations = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.conversations || [];
};

export const getMessages = async (workspaceId, conversationId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return (ws.data.messages || []).filter((m) => m.conversation === conversationId);
};

export const sendMessage = async (workspaceId, conversationId, { text }) => {
  if (!text || !text.trim()) {
    throw new ApiError(400, 'Message text is required');
  }

  const ws = await getOrCreateWorkspace(workspaceId);
  const conv = (ws.data.conversations || []).find((c) => c._id === conversationId);
  if (!conv) {
    throw new ApiError(404, 'Conversation not found in demo workspace');
  }

  const peer = conv.participants?.find((p) => (p._id || p) !== DEMO_USER_ID);

  const newMsg = {
    _id: 'demo_msg_' + Date.now(),
    conversation: conversationId,
    sender: DEMO_USER_ID,
    recipient: peer?._id || peer || 'peer_1',
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  ws.data.messages = ws.data.messages || [];
  ws.data.messages.push(newMsg);

  conv.lastMessage = {
    text: newMsg.text,
    sender: DEMO_USER_ID,
    createdAt: newMsg.createdAt,
  };
  conv.updatedAt = newMsg.createdAt;

  await saveWorkspace(ws);
  return newMsg;
};

/* ==========================================================================
 * NOTIFICATIONS
 * ========================================================================== */

export const getNotifications = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.notifications || [];
};

export const markNotificationRead = async (workspaceId, notificationId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const notif = (ws.data.notifications || []).find((n) => n._id === notificationId);
  if (notif) {
    notif.read = true;
  }
  await saveWorkspace(ws);
  return notif;
};

/* ==========================================================================
 * PORTFOLIO & PROOF-OF-SKILL
 * ========================================================================== */

export const getUserPortfolio = async (workspaceId, targetUserId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const items = ws.data.portfolioItems || [];

  return {
    items,
    stats: {
      totalItems: items.length,
      confirmedCount: items.filter((i) => i.verificationStatus === 'EXCHANGE_CONFIRMED').length,
      evidenceCount: items.filter((i) => i.verificationStatus === 'PORTFOLIO_EVIDENCE').length,
      selfReportedCount: items.filter((i) => i.verificationStatus === 'SELF_REPORTED').length,
    },
  };
};

export const createPortfolioItem = async (workspaceId, itemData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const newItem = {
    _id: 'demo_port_' + Date.now(),
    user: DEMO_USER_ID,
    title: itemData.title.trim(),
    skillName: itemData.skillName.trim(),
    category: itemData.category || 'General',
    verificationStatus: 'SELF_REPORTED', // Self-reported by default unless linked to exchange session
    itemType: itemData.itemType || 'PROJECT',
    description: itemData.description ? itemData.description.trim() : '',
    evidenceUrl: itemData.evidenceUrl ? itemData.evidenceUrl.trim() : '',
    visibility: itemData.visibility || 'PUBLIC',
    createdAt: new Date().toISOString(),
  };

  ws.data.portfolioItems = ws.data.portfolioItems || [];
  ws.data.portfolioItems.unshift(newItem);

  await saveWorkspace(ws);
  return newItem;
};

export const updatePortfolioItem = async (workspaceId, itemId, updateData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const item = (ws.data.portfolioItems || []).find((p) => p._id === itemId);
  if (!item) {
    throw new ApiError(404, 'Portfolio item not found in demo workspace');
  }

  if (updateData.title) item.title = updateData.title.trim();
  if (updateData.description) item.description = updateData.description.trim();
  if (updateData.evidenceUrl !== undefined) item.evidenceUrl = updateData.evidenceUrl.trim();
  if (updateData.visibility) item.visibility = updateData.visibility;

  await saveWorkspace(ws);
  return item;
};

export const deletePortfolioItem = async (workspaceId, itemId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const initialLength = (ws.data.portfolioItems || []).length;
  ws.data.portfolioItems = (ws.data.portfolioItems || []).filter((p) => p._id !== itemId);

  if (ws.data.portfolioItems.length === initialLength) {
    throw new ApiError(404, 'Portfolio item not found in demo workspace');
  }

  await saveWorkspace(ws);
  return { success: true };
};

/* ==========================================================================
 * AI LEARNING COACH
 * ========================================================================== */

export const getCoachRecommendations = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.coachRecommendations || [];
};

export const updateCoachRecommendationStatus = async (workspaceId, recId, { status, dismissalReason }) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const rec = (ws.data.coachRecommendations || []).find((r) => r._id === recId);
  if (!rec) {
    throw new ApiError(404, 'Coach recommendation not found in demo workspace');
  }

  rec.status = status;
  if (dismissalReason) {
    rec.dismissalReason = dismissalReason;
  }
  rec.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return rec;
};

export const getCoachingAdvice = async (workspaceId, topic = 'general') => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return {
    topic,
    advice: 'Focus on hands-on application of your design systems learning. Pairing with Sarah Chen on Figma variables will unlock rapid prototyping for your SaaS blueprint.',
    checklist: [
      'Document your color variables and typography tokens in Figma',
      'Walk through the responsive navigation flow with a peer',
      'Export production tokens into your React component library',
    ],
    generatedAt: new Date().toISOString(),
    isSimulated: true,
  };
};

/* ==========================================================================
 * TRUST & CONTRIBUTION METRICS
 * ========================================================================== */

export const getUserTrustProfile = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return {
    user: {
      _id: DEMO_USER_ID,
      name: ws.data.profile?.name || 'Alex Morgan',
      email: ws.data.profile?.email || 'demo@enhanceus.org',
      isDemo: true,
      role: 'user',
      createdAt: ws.data.profile?.createdAt,
    },
    trust: ws.data.trustSummary,
  };
};

/* ==========================================================================
 * COMMUNITY INSIGHTS
 * ========================================================================== */

export const getCommunityInsights = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return ws.data.communityInsights;
};

/* ==========================================================================
 * SIMULATED FEEDBACK SUBMISSION (SAFEGUARD: ZERO REAL EMAILS)
 * ========================================================================== */

export const recordFeedback = async (workspaceId, feedbackData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const feedbackItem = {
    _id: 'demo_fb_' + Date.now(),
    user: DEMO_USER_ID,
    rating: feedbackData.rating,
    improvements: feedbackData.improvements ? feedbackData.improvements.trim() : '',
    newFeatures: feedbackData.newFeatures ? feedbackData.newFeatures.trim() : '',
    comments: feedbackData.comments ? feedbackData.comments.trim() : '',
    simulated: true,
    emailDelivered: false, // Explicitly false: NEVER dispatched to real email inbox!
    status: 'SIMULATED_DEMO',
    submittedAt: new Date().toISOString(),
  };

  ws.data.feedbackSubmissions = ws.data.feedbackSubmissions || [];
  ws.data.feedbackSubmissions.unshift(feedbackItem);

  await saveWorkspace(ws);
  return {
    success: true,
    simulated: true,
    message: 'Feedback recorded in your demo sandbox. (Simulated delivery: external email dispatch was safely bypassed).',
    feedbackId: feedbackItem._id,
  };
};

/* ==========================================================================
 * TOUR STATE
 * ========================================================================== */

export const getTourStatus = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  return { tourDismissed: Boolean(ws.tourDismissed) };
};

export const dismissTour = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.tourDismissed = true;
  await saveWorkspace(ws);
  return { success: true, tourDismissed: true };
};
