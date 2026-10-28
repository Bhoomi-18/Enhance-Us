import crypto from 'crypto';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { getCanonicalBaseline, BASELINE_VERSION, DEMO_USER_ID } from '../fixtures/canonicalDemoBaseline.js';
import { ApiError } from '../utils/apiError.js';
import calculateSkillGaps from './skillGapEngine.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';
import { ACHIEVEMENT_DEFINITIONS } from '../models/userAchievementModel.js';

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

export const toggleGoalStatus = async (workspaceId, goalId, { status }) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goal = (ws.data.goals || []).find((g) => g._id === goalId);
  if (!goal) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  goal.status = status;
  if (status === 'COMPLETED') {
    goal.progress = 100;
  } else {
    if (goal.requiredSkills && goal.requiredSkills.length > 0) {
      const completedCount = goal.requiredSkills.filter((s) => s.isCompleted).length;
      goal.progress = Math.round((completedCount / goal.requiredSkills.length) * 100);
    } else {
      goal.progress = 0;
    }
  }
  goal.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return goal;
};

export const toggleRequiredSkillCompletion = async (workspaceId, goalId, { skillId, skillName, isCompleted }) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goal = (ws.data.goals || []).find((g) => g._id === goalId);
  if (!goal) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  goal.requiredSkills = goal.requiredSkills || [];
  const skill = goal.requiredSkills.find(
    (s) => (skillId && s._id === skillId) || (skillName && s.name.toLowerCase() === skillName.toLowerCase())
  );

  if (!skill) {
    throw new ApiError(404, 'Required skill not found in goal');
  }

  skill.isCompleted = isCompleted;
  skill.completedAt = isCompleted ? new Date().toISOString() : null;

  const total = goal.requiredSkills.length;
  const completed = goal.requiredSkills.filter((s) => s.isCompleted).length;
  goal.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (goal.progress === 100) {
    goal.status = 'COMPLETED';
  } else if (goal.status === 'COMPLETED' && !isCompleted) {
    goal.status = 'ACTIVE';
  }
  goal.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return goal;
};

export const addRequiredSkillToGoal = async (workspaceId, goalId, { name, category, level, importance }) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goal = (ws.data.goals || []).find((g) => g._id === goalId);
  if (!goal) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  goal.requiredSkills = goal.requiredSkills || [];
  const trimmedName = name.trim();
  const exists = goal.requiredSkills.some((s) => s.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    throw new ApiError(400, `Skill "${trimmedName}" is already listed in this goal.`);
  }

  goal.requiredSkills.push({
    _id: 'rsk_' + Date.now(),
    name: trimmedName,
    category: category || 'General',
    level: level || 'INTERMEDIATE',
    importance: importance || 'HIGH',
    isCompleted: false,
    completedAt: null,
  });

  const total = goal.requiredSkills.length;
  const completed = goal.requiredSkills.filter((s) => s.isCompleted).length;
  goal.progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  if (goal.status === 'COMPLETED' && goal.progress < 100) {
    goal.status = 'ACTIVE';
  }
  goal.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return goal;
};

export const removeRequiredSkillFromGoal = async (workspaceId, goalId, { skillId, skillName }) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const goal = (ws.data.goals || []).find((g) => g._id === goalId);
  if (!goal) {
    throw new ApiError(404, 'Goal not found in demo workspace');
  }

  goal.requiredSkills = (goal.requiredSkills || []).filter(
    (s) => !((skillId && s._id === skillId) || (skillName && s.name.toLowerCase() === skillName.toLowerCase()))
  );

  const total = goal.requiredSkills.length;
  const completed = goal.requiredSkills.filter((s) => s.isCompleted).length;
  goal.progress = total > 0 ? Math.round((completed / total) * 100) : goal.status === 'COMPLETED' ? 100 : 0;
  goal.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return goal;
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
  ws.data.exchangeRequests = ws.data.exchangeRequests || [];

  const recipientId = (requestData.recipientId || requestData.recipient)?.toString();
  if (recipientId === DEMO_USER_ID) {
    throw new ApiError(400, 'Cannot send exchange request to yourself');
  }

  // Check pending request constraint
  const existingPending = ws.data.exchangeRequests.find(
    (r) =>
      r.status === 'PENDING' &&
      ((r.sender?._id || r.sender)?.toString() === DEMO_USER_ID &&
       (r.recipient?._id || r.recipient)?.toString() === recipientId)
  );

  if (existingPending) {
    throw new ApiError(409, 'You already have an outstanding pending session request to this peer.');
  }

  const messageText = requestData.message || requestData.proposedExchange || 'Looking forward to exchanging skills!';
  if (messageText.length > 500) {
    throw new ApiError(400, 'Message cannot exceed 500 characters');
  }

  const newRequest = {
    _id: 'demo_req_' + Date.now(),
    sender: {
      _id: DEMO_USER_ID,
      name: ws.data.profile?.name || 'Alex Morgan',
      avatar: ws.data.profile?.avatar,
      skills: ws.data.profile?.skills || [],
    },
    recipient: recipientId,
    goal: requestData.goalId,
    offeredSkill: requestData.offeredSkill,
    requestedSkill: requestData.requestedSkill,
    message: messageText,
    proposedExchange: messageText,
    isDirectRequest: Boolean(requestData.isDirectRequest),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  ws.data.exchangeRequests.push(newRequest);

  // Update match status to PENDING if present
  const match = (ws.data.matches || []).find((m) => (m.candidate?._id || m.candidate) === recipientId);
  if (match) {
    match.status = 'PENDING';
  }

  await saveWorkspace(ws);
  return newRequest;
};

export const getUserExchangeRequests = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.exchangeRequests = ws.data.exchangeRequests || [];
  return ws.data.exchangeRequests;
};

export const getPendingRequestStatus = async (workspaceId, peerId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.exchangeRequests = ws.data.exchangeRequests || [];
  const peerIdStr = peerId?.toString();

  const pendingRequest = ws.data.exchangeRequests.find(
    (r) =>
      r.status === 'PENDING' &&
      ((r.sender?._id || r.sender)?.toString() === DEMO_USER_ID &&
       (r.recipient?._id || r.recipient)?.toString() === peerIdStr)
  );

  return {
    hasPendingRequest: Boolean(pendingRequest),
    pendingRequest: pendingRequest || null,
  };
};

export const acceptExchangeRequest = async (workspaceId, requestId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.exchangeRequests = ws.data.exchangeRequests || [];

  const req = ws.data.exchangeRequests.find((r) => r._id === requestId);
  if (!req) {
    throw new ApiError(404, 'Exchange request not found in workspace');
  }

  req.status = 'ACCEPTED';
  req.updatedAt = new Date().toISOString();

  // Create active connection if not exists
  ws.data.connections = ws.data.connections || [];
  const senderId = (req.sender?._id || req.sender)?.toString();
  const existingConn = ws.data.connections.find((c) =>
    (c.participants || []).some((p) => (p._id || p)?.toString() === senderId)
  );

  if (!existingConn) {
    const senderPeer = (ws.data.peers || []).find((p) => p._id === senderId) || {
      _id: senderId,
      name: req.sender?.name || 'Peer',
    };
    ws.data.connections.push({
      _id: 'demo_conn_' + Date.now(),
      participants: [
        { _id: DEMO_USER_ID, name: ws.data.profile?.name || 'Alex Morgan', avatar: ws.data.profile?.avatar },
        senderPeer,
      ],
      skills: {
        userASkill: req.offeredSkill || 'Teaching',
        userBSkill: req.requestedSkill || 'Learning',
      },
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    });
  }

  await saveWorkspace(ws);
  return req;
};

export const declineExchangeRequest = async (workspaceId, requestId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.exchangeRequests = ws.data.exchangeRequests || [];

  const req = ws.data.exchangeRequests.find((r) => r._id === requestId);
  if (!req) {
    throw new ApiError(404, 'Exchange request not found in workspace');
  }

  req.status = 'DECLINED';
  req.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return req;
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

/* ==========================================================================
 * V3.5 RETENTION & PERSONALIZATION (SANDBOXED FOR DEMO VISITORS)
 * ========================================================================== */

export const getNotificationPreferences = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const prefs = ws.data.profile?.notificationPreferences || {
    sessionUpdates: true,
    goalReminders: true,
    peerActivity: true,
    circleActivity: true,
    platformAnnouncements: true,
  };
  return prefs;
};

export const updateNotificationPreferences = async (workspaceId, preferences) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.profile = ws.data.profile || {};
  ws.data.profile.notificationPreferences = {
    ...(ws.data.profile.notificationPreferences || {}),
    ...preferences,
  };
  await saveWorkspace(ws);
  return ws.data.profile.notificationPreferences;
};

export const dismissOnboarding = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.profile = ws.data.profile || {};
  ws.data.profile.dismissedOnboardingAt = new Date().toISOString();
  await saveWorkspace(ws);
  return { success: true, dismissedOnboardingAt: ws.data.profile.dismissedOnboardingAt };
};

export const completeOnboarding = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.profile = ws.data.profile || {};
  if (!ws.data.profile.onboardingCompletedAt) {
    ws.data.profile.onboardingCompletedAt = new Date().toISOString();
  }
  await saveWorkspace(ws);
  return { success: true, user: ws.data.profile };
};

export const getDashboardFeed = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const data = ws.data;

  const profile = data.profile || {};
  const goals = data.goals || [];
  const roadmaps = data.roadmaps || [];
  const sessions = data.sessions || [];
  const reviews = data.reviews || [];
  const circles = data.circles || [];
  const connections = data.connections || [];

  // Roadmap lookup by goal ID
  const roadmapByGoalId = new Map();
  roadmaps.forEach((r) => {
    if (r.goal) roadmapByGoalId.set(r.goal.toString(), r);
  });

  // 1. Next Best Actions (Deterministic for Demo)
  const nextBestActions = [];

  // Completed session review check
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED');
  const sessionNeedingReview = completedSessions.find((s) => !s.hasFeedback);
  if (sessionNeedingReview) {
    nextBestActions.push({
      id: `review_${sessionNeedingReview._id}`,
      type: 'PENDING_REVIEW',
      priority: 'HIGH',
      title: `Leave Peer Review for ${sessionNeedingReview.skillTaught || 'Session'}`,
      description: 'Exchange session completed with Sarah Chen. Leave a peer review to help build verified proof-of-skill.',
      link: '/sessions',
      actionLabel: 'Leave Review',
      icon: 'Star',
      reason: 'Exchange session completed recently',
    });
  }

  // Upcoming scheduled session
  const scheduledSessions = sessions.filter((s) => s.status === 'SCHEDULED');
  if (scheduledSessions.length > 0) {
    const nextSession = scheduledSessions[0];
    nextBestActions.push({
      id: `upcoming_session_${nextSession._id}`,
      type: 'UPCOMING_SESSION',
      priority: 'HIGH',
      title: `Prepare for: ${nextSession.skillTaught || 'Session'}`,
      description: `Scheduled for tomorrow at ${nextSession.time || '2:00 PM'}. Review agenda and preparation notes.`,
      link: '/sessions',
      actionLabel: 'View Session',
      icon: 'Calendar',
      reason: 'Upcoming session on your schedule',
    });
  }

  // Active or paused goal
  const activeGoals = goals.filter((g) => g.status === 'ACTIVE');
  const pausedGoals = goals.filter((g) => g.status === 'PAUSED');
  const relevantGoal = activeGoals[0] || pausedGoals[0];

  if (relevantGoal) {
    const relatedRoadmap = roadmapByGoalId.get(relevantGoal._id.toString());
    let nextMsTitle = 'Milestone in progress';
    let link = `/goals/${relevantGoal._id}`;

    if (relatedRoadmap && Array.isArray(relatedRoadmap.milestones)) {
      const nextMs = relatedRoadmap.milestones.find((m) => m.status !== 'COMPLETED');
      if (nextMs) {
        nextMsTitle = nextMs.title;
        link = `/roadmaps/${relatedRoadmap._id}`;
      }
    }

    const isPaused = relevantGoal.status === 'PAUSED';
    nextBestActions.push({
      id: `continue_goal_${relevantGoal._id}`,
      type: isPaused ? 'RESUME_GOAL' : 'CONTINUE_GOAL',
      priority: 'MEDIUM',
      title: isPaused ? `Resume Goal: ${relevantGoal.title}` : `Continue Goal: ${relevantGoal.title}`,
      description: `Target step: ${nextMsTitle}. Current progress: ${relevantGoal.progress || 0}%.`,
      link,
      actionLabel: isPaused ? 'Resume Learning' : 'Continue Learning',
      icon: 'Target',
      reason: isPaused ? 'Goal is currently paused' : 'Active goal in progress',
    });

    if (relevantGoal.skillGaps?.missingSkills?.length > 0) {
      const missing = relevantGoal.skillGaps.missingSkills[0];
      nextBestActions.push({
        id: `match_gap_${missing.name || 'skill'}`,
        type: 'FIND_PARTNER',
        priority: 'MEDIUM',
        title: `Find Partner for ${missing.name}`,
        description: `Missing skill identified in your "${relevantGoal.title}" blueprint. Connect with a peer partner.`,
        link: '/matches',
        actionLabel: 'Discover Matches',
        icon: 'Zap',
        reason: `Required for "${relevantGoal.title}"`,
      });
    }
  }

  // 2. Unfinished Learning Continuity
  let unfinishedLearning = null;
  if (relevantGoal) {
    const relatedRoadmap = roadmapByGoalId.get(relevantGoal._id.toString());
    let currentMilestone = null;
    let completedMilestones = 0;
    let totalMilestones = 0;

    if (relatedRoadmap && Array.isArray(relatedRoadmap.milestones)) {
      totalMilestones = relatedRoadmap.milestones.length;
      completedMilestones = relatedRoadmap.milestones.filter((m) => m.status === 'COMPLETED').length;
      currentMilestone = relatedRoadmap.milestones.find((m) => m.status !== 'COMPLETED') || null;
    }

    unfinishedLearning = {
      goalId: relevantGoal._id,
      title: relevantGoal.title,
      description: relevantGoal.description,
      status: relevantGoal.status,
      progress: relevantGoal.progress || 0,
      totalMilestones,
      completedMilestones,
      currentMilestoneTitle: currentMilestone?.title || 'Next milestone',
      currentMilestoneSkill: currentMilestone?.skillName || '',
      roadmapId: relatedRoadmap?._id || null,
      continueLink: relatedRoadmap ? `/roadmaps/${relatedRoadmap._id}` : `/goals/${relevantGoal._id}`,
    };
  }

  // 3. Chronological Activity Timeline (from genuine workspace baseline)
  const rawEvents = [];

  goals.forEach((g) => {
    rawEvents.push({
      id: `timeline_goal_${g._id}`,
      type: 'GOAL_CREATED',
      title: `Created goal blueprint "${g.title}"`,
      subtitle: `${g.requiredSkills?.length || 0} skills analyzed`,
      timestamp: g.createdAt || new Date().toISOString(),
      link: `/goals/${g._id}`,
      icon: 'Target',
    });
  });

  roadmaps.forEach((r) => {
    (r.milestones || []).forEach((m) => {
      if (m.status === 'COMPLETED' || m.completedAt) {
        rawEvents.push({
          id: `timeline_ms_${m.milestoneId || m.title}`,
          type: 'MILESTONE_COMPLETED',
          title: `Completed milestone: "${m.title}"`,
          subtitle: `Skill: ${m.skillName || 'General'}`,
          timestamp: m.completedAt || r.updatedAt || new Date().toISOString(),
          link: `/roadmaps/${r._id}`,
          icon: 'Award',
        });
      }
    });
  });

  sessions.forEach((s) => {
    if (s.status === 'COMPLETED') {
      rawEvents.push({
        id: `timeline_sess_${s._id}`,
        type: 'SESSION_COMPLETED',
        title: `Completed learning session on "${s.skillTaught}"`,
        subtitle: `${s.durationMinutes || 60} min peer exchange`,
        timestamp: s.date || new Date().toISOString(),
        link: '/sessions',
        icon: 'Clock',
      });
    } else if (s.status === 'SCHEDULED') {
      rawEvents.push({
        id: `timeline_sess_sched_${s._id}`,
        type: 'SESSION_SCHEDULED',
        title: `Scheduled exchange session on "${s.skillTaught}"`,
        subtitle: `${new Date(s.date).toLocaleDateString()} at ${s.time || ''}`,
        timestamp: s.createdAt || s.date || new Date().toISOString(),
        link: '/sessions',
        icon: 'Calendar',
      });
    }
  });

  reviews.forEach((rev) => {
    rawEvents.push({
      id: `timeline_rev_${rev._id}`,
      type: 'REVIEW_RECEIVED',
      title: `Received ${rev.rating}★ peer review`,
      subtitle: rev.comment ? `"${rev.comment.substring(0, 70)}..."` : 'Verified exchange feedback',
      timestamp: rev.createdAt || new Date().toISOString(),
      link: '/profile',
      icon: 'Star',
    });
  });

  circles.forEach((c) => {
    rawEvents.push({
      id: `timeline_circle_${c._id}`,
      type: 'CIRCLE_JOINED',
      title: `Joined learning circle "${c.name}"`,
      subtitle: `${c.memberCount || 1} members`,
      timestamp: c.createdAt || new Date().toISOString(),
      link: `/circles/${c._id}`,
      icon: 'Users',
    });
  });

  rawEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const activityTimeline = rawEvents.slice(0, 10);

  // 4. Onboarding Status
  const onboarding = {
    isCompleted: Boolean(profile.onboardingCompletedAt),
    completedAt: profile.onboardingCompletedAt,
    dismissedAt: profile.dismissedOnboardingAt || null,
    steps: [
      { id: 'offer_skill', label: 'Offer a skill you can teach', completed: true, link: '/profile', actionText: 'Edit Profile' },
      { id: 'create_goal', label: 'Define your first learning goal', completed: goals.length > 0, link: '/goals', actionText: 'Create Goal' },
      { id: 'connect_peer', label: 'Find a peer partner or join a circle', completed: sessions.length > 0 || circles.length > 0, link: '/matches', actionText: 'Discover Peers' },
    ],
  };

  // 5. Respectful Return Summary
  const returnSummary = {
    greeting: `Welcome back, Alex!`,
    message: relevantGoal ? `You are making steady progress on "${relevantGoal.title}".` : 'Ready to resume your learning goals?',
    hasActiveGoal: Boolean(relevantGoal),
    activeGoalTitle: relevantGoal ? relevantGoal.title : null,
    activeGoalProgress: relevantGoal ? relevantGoal.progress : 0,
    continueLink: unfinishedLearning ? unfinishedLearning.continueLink : '/goals',
  };

  // 6. Metrics Overview
  const totalGoals = goals.length;
  const activeGoalsCount = activeGoals.length;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / totalGoals) : 0;
  const totalGaps = goals.reduce((acc, g) => acc + (g.skillGaps?.missingSkills?.length || 0), 0);

  return {
    nextBestActions: nextBestActions.slice(0, 4),
    unfinishedLearning,
    activityTimeline,
    onboarding,
    returnSummary,
    metrics: {
      totalGoals,
      activeGoals: activeGoalsCount,
      avgProgress,
      totalGaps,
      sessionsCompleted: profile.sessionsCompleted || 4,
    },
  };
};

/**
 * V3.6 Demo Workspace Support: Skill Evidence Management
 */
export const addOrUpdateSkillEvidence = async (workspaceId, skillName, evidenceData) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const skills = ws.data.profile?.skills || [];
  const normTarget = normalizeSkillName(skillName);
  const skill = skills.find((s) => normalizeSkillName(s.name) === normTarget);
  if (!skill) {
    throw new ApiError(404, `Skill "${skillName}" not found on profile`);
  }

  const { portfolioUrl, certificateUrl, workSampleUrl, description } = evidenceData || {};
  const cleanPortfolioUrl = (portfolioUrl || '').trim();
  const cleanCertificateUrl = (certificateUrl || '').trim();
  const cleanWorkSampleUrl = (workSampleUrl || '').trim();
  const cleanDescription = (description || '').trim();

  if (cleanPortfolioUrl && !/^https?:\/\/.+/i.test(cleanPortfolioUrl)) {
    throw new ApiError(400, 'Portfolio URL must use http or https protocol');
  }
  if (cleanCertificateUrl && !/^https?:\/\/.+/i.test(cleanCertificateUrl)) {
    throw new ApiError(400, 'Certificate URL must use http or https protocol');
  }
  if (cleanWorkSampleUrl && !/^https?:\/\/.+/i.test(cleanWorkSampleUrl)) {
    throw new ApiError(400, 'Work sample URL must use http or https protocol');
  }

  skill.evidence = {
    portfolioUrl: cleanPortfolioUrl,
    certificateUrl: cleanCertificateUrl,
    workSampleUrl: cleanWorkSampleUrl,
    description: cleanDescription,
    verificationStatus: 'SUBMITTED',
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewerNotes: '',
    rejectionReason: '',
  };

  await saveWorkspace(ws);
  return {
    skillName: skill.name,
    evidence: skill.evidence,
  };
};

export const deleteSkillEvidence = async (workspaceId, skillName) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const skills = ws.data.profile?.skills || [];
  const normTarget = normalizeSkillName(skillName);
  const skill = skills.find((s) => normalizeSkillName(s.name) === normTarget);
  if (!skill) {
    throw new ApiError(404, `Skill "${skillName}" not found on profile`);
  }

  skill.evidence = {
    portfolioUrl: '',
    certificateUrl: '',
    workSampleUrl: '',
    description: '',
    verificationStatus: 'NOT_SUBMITTED',
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    reviewerNotes: '',
    rejectionReason: '',
  };

  await saveWorkspace(ws);
  return {
    skillName: skill.name,
    evidence: skill.evidence,
  };
};

export const getPendingEvidenceSkills = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const queue = [];

  const profileSkills = ws.data.profile?.skills || [];
  profileSkills.forEach((sk) => {
    if (sk.evidence && sk.evidence.verificationStatus !== 'NOT_SUBMITTED') {
      queue.push({
        userId: ws.userId,
        userName: ws.data.profile?.name || 'Alex Morgan',
        userEmail: ws.data.profile?.email || 'demo@enhanceus.org',
        skillName: sk.name,
        skillCategory: sk.category || 'General',
        skillLevel: sk.level || 'INTERMEDIATE',
        evidence: sk.evidence,
        submittedAt: sk.evidence.submittedAt,
        verificationStatus: sk.evidence.verificationStatus,
      });
    }
  });

  const peers = ws.data.peers || [];
  peers.forEach((peer) => {
    (peer.skills || []).forEach((sk) => {
      if (sk.evidence && sk.evidence.verificationStatus !== 'NOT_SUBMITTED') {
        queue.push({
          userId: peer._id,
          userName: peer.name,
          userEmail: peer.email,
          skillName: sk.name,
          skillCategory: sk.category || 'General',
          skillLevel: sk.level || 'INTERMEDIATE',
          evidence: sk.evidence,
          submittedAt: sk.evidence.submittedAt,
          verificationStatus: sk.evidence.verificationStatus,
        });
      }
    });
  });

  return queue;
};

export const moderateSkillEvidence = async (workspaceId, targetUserId, skillName, decisionData, adminUser) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const { action, reviewerNotes, rejectionReason } = decisionData || {};
  const normTarget = normalizeSkillName(skillName);

  let targetSkill = null;
  if (targetUserId === ws.userId || targetUserId === 'demo_user_canonical_001') {
    targetSkill = (ws.data.profile?.skills || []).find((s) => normalizeSkillName(s.name) === normTarget);
  } else {
    const peer = (ws.data.peers || []).find((p) => p._id === targetUserId);
    if (peer) {
      targetSkill = (peer.skills || []).find((s) => normalizeSkillName(s.name) === normTarget);
    }
  }

  if (!targetSkill) {
    throw new ApiError(404, `Skill "${skillName}" not found for target user`);
  }

  if (!targetSkill.evidence) {
    targetSkill.evidence = { verificationStatus: 'NOT_SUBMITTED' };
  }

  if (action === 'VERIFY') {
    targetSkill.evidence.verificationStatus = 'VERIFIED';
    targetSkill.evidence.reviewedAt = new Date().toISOString();
    targetSkill.evidence.reviewedBy = adminUser?._id || 'demo_admin';
    targetSkill.evidence.reviewerNotes = reviewerNotes || 'Verified evidence';
    targetSkill.evidence.rejectionReason = '';
  } else if (action === 'REJECT') {
    targetSkill.evidence.verificationStatus = 'REJECTED';
    targetSkill.evidence.reviewedAt = new Date().toISOString();
    targetSkill.evidence.reviewedBy = adminUser?._id || 'demo_admin';
    targetSkill.evidence.reviewerNotes = reviewerNotes || '';
    targetSkill.evidence.rejectionReason = rejectionReason || reviewerNotes || 'Evidence did not meet criteria';
  } else if (action === 'UNDER_REVIEW') {
    targetSkill.evidence.verificationStatus = 'UNDER_REVIEW';
    targetSkill.evidence.reviewerNotes = reviewerNotes || '';
  }

  await saveWorkspace(ws);
  return {
    skillName: targetSkill.name,
    evidence: targetSkill.evidence,
  };
};

export const createReport = async (workspaceId, reportData, reporter) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const { targetType, targetId, category, reason, reportedUserId, metadata } = reportData || {};

  if (!reason || reason.trim().length < 5) {
    throw new ApiError(400, 'Explanation must be at least 5 characters long');
  }

  const newReport = {
    _id: 'demo_report_' + Date.now(),
    reporter: {
      _id: reporter?._id || ws.userId,
      name: ws.data.profile?.name || 'Alex Morgan',
      email: ws.data.profile?.email || 'demo@enhanceus.org',
    },
    reportedUser: {
      _id: reportedUserId || targetId,
      name: 'Reported Peer',
      email: 'peer@enhanceus.org',
      isSuspended: false,
    },
    targetType: targetType || 'USER',
    targetId: targetId || 'demo_target',
    category: category || 'MISLEADING_SKILL_CLAIMS',
    reason: reason.trim(),
    status: 'PENDING',
    moderationNotes: '',
    actionTaken: 'NONE',
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };

  ws.data.reports = ws.data.reports || [];
  ws.data.reports.unshift(newReport);
  await saveWorkspace(ws);

  return {
    message: 'Report submitted successfully. Our moderation team will review this content.',
    report: newReport,
  };
};

export const getReports = async (workspaceId, filters = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  let reports = ws.data.reports || [];
  if (filters.status) {
    reports = reports.filter((r) => r.status === filters.status);
  }
  if (filters.category) {
    reports = reports.filter((r) => r.category === filters.category);
  }
  return reports;
};

export const getReportById = async (workspaceId, reportId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const reports = ws.data.reports || [];
  const rep = reports.find((r) => r._id === reportId);
  if (!rep) throw new ApiError(404, 'Report not found');
  return rep;
};

export const moderateReport = async (workspaceId, reportId, moderationData, adminUser) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const reports = ws.data.reports || [];
  const rep = reports.find((r) => r._id === reportId);
  if (!rep) throw new ApiError(404, 'Report not found');

  const { status, moderationNotes, actionTaken } = moderationData || {};
  if (status) rep.status = status;
  if (actionTaken) rep.actionTaken = actionTaken;
  if (moderationNotes !== undefined) rep.moderationNotes = moderationNotes.trim();
  rep.moderatedAt = new Date().toISOString();
  rep.moderatedBy = {
    _id: adminUser?._id || 'demo_admin',
    name: adminUser?.name || 'Administrator',
  };

  await saveWorkspace(ws);
  return rep;
};

export const updateReview = async (workspaceId, reviewId, updateData, userId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const reviews = ws.data.reviews || [];
  const rev = reviews.find((r) => r._id === reviewId);
  if (!rev) throw new ApiError(404, 'Review not found');

  const { teachingRating, communicationRating, reliabilityRating, feedbackText, rating } = updateData || {};
  let t = Number(teachingRating || rating || rev.teachingRating || 5);
  let c = Number(communicationRating || rating || rev.communicationRating || 5);
  let r = Number(reliabilityRating || rating || rev.reliabilityRating || 5);

  rev.teachingRating = t;
  rev.communicationRating = c;
  rev.reliabilityRating = r;
  rev.overallRating = Math.round(((t + c + r) / 3) * 10) / 10;
  if (feedbackText !== undefined) rev.feedbackText = feedbackText.trim();
  rev.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return rev;
};

export const deleteReview = async (workspaceId, reviewId, userId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const reviews = ws.data.reviews || [];
  const idx = reviews.findIndex((r) => r._id === reviewId);
  if (idx === -1) throw new ApiError(404, 'Review not found');

  reviews.splice(idx, 1);
  await saveWorkspace(ws);
  return { success: true, message: 'Review deleted successfully' };
};

// =========================================================================
// V3.7 Collaborative Workspace Demo Isolation Handlers
// =========================================================================

export const createCollaborativeWorkspace = async (workspaceId, workspaceData, creator) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const { title, description, associatedSkill, associatedGoalTitle, visibility } = workspaceData || {};

  const cleanTitle = (title || '').trim();
  if (!cleanTitle) throw new ApiError(400, 'Workspace title is required');

  const newWorkspace = {
    _id: 'cws_' + Date.now(),
    title: cleanTitle,
    description: (description || '').trim() || 'Collaborative workspace in demo sandbox',
    associatedSkill: (associatedSkill || '').trim() || 'Software Engineering',
    associatedGoalTitle: (associatedGoalTitle || '').trim(),
    owner: {
      _id: creator?._id || ws.userId,
      name: ws.data.profile?.name || 'Alex Morgan',
      email: ws.data.profile?.email || 'demo@enhanceus.org',
      avatar: null,
    },
    visibility: visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE',
    members: [
      {
        user: {
          _id: creator?._id || ws.userId,
          name: ws.data.profile?.name || 'Alex Morgan',
          email: ws.data.profile?.email || 'demo@enhanceus.org',
          avatar: null,
        },
        role: 'OWNER',
        joinedAt: new Date().toISOString(),
      },
    ],
    invitations: [],
    milestones: [],
    resources: [],
    notes: {
      content: '',
      lastUpdatedBy: {
        _id: creator?._id || ws.userId,
        name: ws.data.profile?.name || 'Alex Morgan',
      },
      updatedAt: new Date().toISOString(),
    },
    discussions: [],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ws.data.collaborativeWorkspaces = ws.data.collaborativeWorkspaces || [];
  ws.data.collaborativeWorkspaces.unshift(newWorkspace);
  await saveWorkspace(ws);

  return newWorkspace;
};

export const getUserCollaborativeWorkspaces = async (workspaceId) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const workspaces = (ws.data.collaborativeWorkspaces || []).filter((w) => !w.isArchived);

  const formatted = workspaces.map((w) => {
    const completed = (w.milestones || []).filter((m) => m.status === 'COMPLETED').length;
    const total = (w.milestones || []).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { ...w, progress };
  });

  return {
    workspaces: formatted,
    pendingInvitations: [],
  };
};

export const getDiscoverableCollaborativeWorkspaces = async (workspaceId, query = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const workspaces = (ws.data.collaborativeWorkspaces || []).filter(
    (w) => w.visibility === 'PUBLIC' && !w.isArchived
  );

  return workspaces.map((w) => {
    const completed = (w.milestones || []).filter((m) => m.status === 'COMPLETED').length;
    const total = (w.milestones || []).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { ...w, progress, isMember: true };
  });
};

export const getCollaborativeWorkspaceById = async (workspaceId, targetId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found in demo sandbox');

  const completed = (target.milestones || []).filter((m) => m.status === 'COMPLETED').length;
  const total = (target.milestones || []).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    ...target,
    progress,
    isMember: true,
    isOwner: true,
    userRole: 'OWNER',
  };
};

export const updateCollaborativeWorkspace = async (workspaceId, targetId, updateData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found in demo sandbox');

  const { title, description, associatedSkill, visibility, isArchived } = updateData || {};
  if (title !== undefined) target.title = title.trim();
  if (description !== undefined) target.description = description.trim();
  if (associatedSkill !== undefined) target.associatedSkill = associatedSkill.trim();
  if (visibility !== undefined) target.visibility = visibility;
  if (isArchived !== undefined) target.isArchived = Boolean(isArchived);
  target.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return target;
};

export const inviteCollaborativeMember = async (workspaceId, targetId, targetUserId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  const peer = (ws.data.peers || []).find((p) => p._id === targetUserId);
  const memberName = peer?.name || 'Peer Collaborator';

  target.members = target.members || [];
  target.members.push({
    user: {
      _id: targetUserId,
      name: memberName,
      email: `${memberName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      avatar: null,
    },
    role: 'MEMBER',
    joinedAt: new Date().toISOString(),
  });

  await saveWorkspace(ws);
  return { message: `Simulated invitation accepted: ${memberName} added to workspace.` };
};

export const respondToCollaborativeInvitation = async (workspaceId, targetId, response, user) => {
  return { message: 'Demo invitation updated successfully', status: 'ACCEPTED' };
};

export const removeCollaborativeMember = async (workspaceId, targetId, memberUserId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  target.members = (target.members || []).filter(
    (m) => (m.user?._id || m.user) !== memberUserId
  );
  await saveWorkspace(ws);
  return { message: 'Member removed successfully from demo workspace' };
};

export const addCollaborativeMilestone = async (workspaceId, targetId, milestoneData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  const { title, description, assignedTo, dueDate } = milestoneData || {};
  if (!title || !title.trim()) throw new ApiError(400, 'Milestone title is required');

  const newMilestone = {
    _id: 'cws_ms_' + Date.now(),
    title: title.trim(),
    description: (description || '').trim(),
    status: 'NOT_STARTED',
    assignedTo: {
      _id: user?._id || ws.userId,
      name: user?.name || ws.data.profile?.name || 'Alex Morgan',
    },
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    createdAt: new Date().toISOString(),
  };

  target.milestones = target.milestones || [];
  target.milestones.push(newMilestone);
  target.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return newMilestone;
};

export const updateCollaborativeMilestone = async (workspaceId, targetId, milestoneId, updateData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  const milestone = (target.milestones || []).find((m) => m._id === milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found');

  const { title, description, status } = updateData || {};
  if (title !== undefined) milestone.title = title.trim();
  if (description !== undefined) milestone.description = description.trim();
  if (status !== undefined) {
    milestone.status = status;
    if (status === 'COMPLETED') {
      milestone.completedAt = new Date().toISOString();
      milestone.completedBy = {
        _id: user?._id || ws.userId,
        name: user?.name || ws.data.profile?.name || 'Alex Morgan',
      };
      awardDemoAchievement(ws, user?._id || ws.userId, 'WORKSPACE_CONTRIBUTOR', {
        workspaceId: targetId,
        milestoneId,
        milestoneTitle: milestone.title,
      });
    } else {
      milestone.completedAt = null;
      milestone.completedBy = null;
    }
  }

  target.updatedAt = new Date().toISOString();
  await saveWorkspace(ws);
  return milestone;
};

export const deleteCollaborativeMilestone = async (workspaceId, targetId, milestoneId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  target.milestones = (target.milestones || []).filter((m) => m._id !== milestoneId);
  target.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return { message: 'Milestone removed successfully' };
};

export const addCollaborativeResource = async (workspaceId, targetId, resourceData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  const { title, url, description } = resourceData || {};
  if (!title || !title.trim()) throw new ApiError(400, 'Resource title is required');
  if (!url || !/^https?:\/\/.+/i.test(url.trim())) throw new ApiError(400, 'Valid HTTP/HTTPS URL is required');

  const newResource = {
    _id: 'cws_res_' + Date.now(),
    title: title.trim(),
    url: url.trim(),
    description: (description || '').trim(),
    addedBy: {
      _id: user?._id || ws.userId,
      name: user?.name || ws.data.profile?.name || 'Alex Morgan',
    },
    addedAt: new Date().toISOString(),
  };

  target.resources = target.resources || [];
  target.resources.push(newResource);
  target.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return newResource;
};

export const deleteCollaborativeResource = async (workspaceId, targetId, resourceId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  target.resources = (target.resources || []).filter((r) => r._id !== resourceId);
  target.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return { message: 'Resource removed successfully' };
};

export const updateCollaborativeNotes = async (workspaceId, targetId, content, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  target.notes = {
    content: typeof content === 'string' ? content : '',
    lastUpdatedBy: {
      _id: user?._id || ws.userId,
      name: user?.name || ws.data.profile?.name || 'Alex Morgan',
    },
    updatedAt: new Date().toISOString(),
  };

  target.updatedAt = new Date().toISOString();
  await saveWorkspace(ws);
  return target.notes;
};

export const addCollaborativeDiscussionMessage = async (workspaceId, targetId, content, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const target = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === targetId);
  if (!target) throw new ApiError(404, 'Collaborative workspace not found');

  const cleanContent = (content || '').trim();
  if (!cleanContent) throw new ApiError(400, 'Message cannot be empty');

  const newMsg = {
    _id: 'cws_disc_' + Date.now(),
    author: {
      _id: user?._id || ws.userId,
      name: user?.name || ws.data.profile?.name || 'Alex Morgan',
    },
    content: cleanContent,
    createdAt: new Date().toISOString(),
  };

  target.discussions = target.discussions || [];
  target.discussions.push(newMsg);
  target.updatedAt = new Date().toISOString();

  await saveWorkspace(ws);
  return newMsg;
};

// ==========================================
// V3.8 COMMUNITY CHALLENGES & ACHIEVEMENTS (DEMO SANDBOX)
// ==========================================

export const deriveDemoChallengeStatus = (challenge) => {
  if (challenge.status === 'CANCELLED' || challenge.status === 'DRAFT') {
    return challenge.status;
  }
  const now = new Date();
  const start = new Date(challenge.startDate);
  const end = new Date(challenge.endDate);

  if (now < start) return 'UPCOMING';
  if (now >= start && now <= end) return 'ACTIVE';
  return 'COMPLETED';
};

export const awardDemoAchievement = (ws, userId, key, metadata = {}) => {
  ws.data.userAchievements = ws.data.userAchievements || [];
  const def = ACHIEVEMENT_DEFINITIONS[key];
  if (!def) return null;
  const existing = ws.data.userAchievements.find((a) => a.achievementKey === key);
  if (existing) return existing;

  const newAch = {
    _id: 'ach_demo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    user: userId || DEMO_USER_ID,
    achievementKey: key,
    title: def.title,
    description: def.description,
    icon: def.icon,
    unlockedAt: new Date().toISOString(),
    metadata,
  };
  ws.data.userAchievements.push(newAch);

  // Check meta-achievement: CHALLENGE_MASTER if >= 3 completed
  if (key === 'FIRST_CHALLENGE_COMPLETED') {
    const parts = (ws.data.challengeParticipations || []).filter((p) => p.status === 'COMPLETED');
    if (parts.length >= 3) {
      awardDemoAchievement(ws, userId, 'CHALLENGE_MASTER', { totalCompleted: parts.length });
    }
  }

  return newAch;
};

export const getDemoChallenges = async (workspaceId, query = {}, user = null) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const challenges = ws.data.communityChallenges || [];
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;

  const { skill, status, type, search } = query;

  let filtered = challenges.filter((c) => !c.isArchived && c.visibility !== 'PRIVATE');

  if (status) {
    filtered = filtered.filter((c) => {
      const derived = deriveDemoChallengeStatus(c);
      return derived.toUpperCase() === status.toUpperCase();
    });
  }

  if (type) {
    filtered = filtered.filter((c) => c.participationType === type.toUpperCase());
  }

  if (skill) {
    const sLower = skill.toLowerCase();
    filtered = filtered.filter((c) => (c.associatedSkill || '').toLowerCase().includes(sLower));
  }

  if (search) {
    const qLower = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        (c.title || '').toLowerCase().includes(qLower) ||
        (c.description || '').toLowerCase().includes(qLower) ||
        (c.associatedSkill || '').toLowerCase().includes(qLower)
    );
  }

  const enhanced = filtered.map((c) => {
    const derivedStatus = deriveDemoChallengeStatus(c);
    const participations = (ws.data.challengeParticipations || []).filter(
      (p) => p.challenge === c._id && p.status !== 'ABANDONED'
    );
    const userPart = participations.find((p) => String(p.user) === String(currentUserId));

    return {
      ...c,
      status: derivedStatus,
      participantCount: participations.length,
      isJoined: Boolean(userPart),
      userProgress: userPart ? userPart.progress || 0 : 0,
    };
  });

  return enhanced;
};

export const getUserDemoChallenges = async (workspaceId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const challenges = ws.data.communityChallenges || [];
  const participations = (ws.data.challengeParticipations || []).filter(
    (p) => String(p.user) === String(currentUserId) && p.status !== 'ABANDONED'
  );

  const joinedChallenges = participations.map((p) => {
    const ch = challenges.find((c) => c._id === p.challenge) || {};
    let teamWorkspace = null;
    if (p.teamWorkspace) {
      teamWorkspace = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === p.teamWorkspace);
    }
    return {
      ...ch,
      participationId: p._id,
      participationStatus: p.status,
      participationType: p.participationType,
      teamWorkspace,
      progress: p.progress,
      completedMilestonesCount: (p.completedMilestones || []).length,
      joinedAt: p.joinedAt,
    };
  });

  const createdChallenges = challenges.filter(
    (c) => (c.creator?._id === currentUserId || c.creator === currentUserId) && !c.isArchived
  );

  return {
    joinedChallenges,
    createdChallenges,
  };
};

export const getDemoChallengeById = async (workspaceId, challengeId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId && !c.isArchived);

  if (!ch) throw new ApiError(404, 'Challenge not found');

  const participations = (ws.data.challengeParticipations || []).filter(
    (p) => p.challenge === challengeId && p.status !== 'ABANDONED'
  );

  const userParticipation = participations.find((p) => String(p.user) === String(currentUserId)) || null;

  let participatingTeams = [];
  if (ch.participationType === 'TEAM') {
    const teamParts = participations.filter((p) => p.teamWorkspace);
    participatingTeams = teamParts.map((tp) => {
      const teamWs = (ws.data.collaborativeWorkspaces || []).find((w) => w._id === tp.teamWorkspace);
      return {
        ...tp,
        teamWorkspace: teamWs || { _id: tp.teamWorkspace, title: 'Collaborative Team' },
      };
    });
  }

  return {
    ...ch,
    status: deriveDemoChallengeStatus(ch),
    participantCount: participations.length,
    userParticipation,
    participatingTeams,
  };
};

export const createDemoChallenge = async (workspaceId, challengeData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;

  const {
    title,
    description,
    associatedSkill,
    associatedGoalTitle,
    startDate,
    endDate,
    participationType,
    visibility,
    capacity,
    milestones,
    rules,
  } = challengeData || {};

  const cleanTitle = (title || '').trim();
  if (cleanTitle.length < 3) throw new ApiError(400, 'Title must be at least 3 characters');
  if (cleanTitle.length > 120) throw new ApiError(400, 'Title cannot exceed 120 characters');

  const cleanDesc = (description || '').trim();
  if (cleanDesc.length < 10) throw new ApiError(400, 'Description must be at least 10 characters');

  if (!associatedSkill || !associatedSkill.trim()) {
    throw new ApiError(400, 'Associated skill is required');
  }

  if (!startDate || !endDate) {
    throw new ApiError(400, 'Both start date and end date are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    throw new ApiError(400, 'End date must be strictly after the start date');
  }

  const cleanMilestones = (Array.isArray(milestones) ? milestones : [])
    .map((m, idx) => {
      const mTitle = (m.title || '').trim();
      if (!mTitle) return null;
      return {
        _id: 'ch_ms_demo_' + Date.now() + '_' + idx,
        title: mTitle.slice(0, 150),
        description: (m.description || '').trim().slice(0, 500),
        criteria: (m.criteria || '').trim().slice(0, 300),
        order: idx,
      };
    })
    .filter(Boolean);

  const newChallenge = {
    _id: 'ch_demo_' + Date.now(),
    title: cleanTitle,
    description: cleanDesc,
    associatedSkill: associatedSkill.trim(),
    associatedGoalTitle: (associatedGoalTitle || '').trim().slice(0, 150),
    creator: {
      _id: currentUserId,
      name: user?.name || ws.data.profile?.name || 'Alex Morgan',
      email: user?.email || 'demo@enhanceus.org',
      avatar: user?.avatar || ws.data.profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    },
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    participationType: participationType === 'TEAM' ? 'TEAM' : 'INDIVIDUAL',
    visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
    capacity: capacity ? Math.min(1000, Math.max(1, parseInt(capacity, 10))) : null,
    status: deriveDemoChallengeStatus({ startDate: start, endDate: end }),
    milestones: cleanMilestones,
    rules: Array.isArray(rules) ? rules.map((r) => String(r).trim()).filter(Boolean) : [],
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  ws.data.communityChallenges = ws.data.communityChallenges || [];
  ws.data.communityChallenges.unshift(newChallenge);
  await saveWorkspace(ws);

  return newChallenge;
};

export const updateDemoChallenge = async (workspaceId, challengeId, updateData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId);
  if (!ch) throw new ApiError(404, 'Challenge not found');

  if (ch.status === 'CANCELLED') throw new ApiError(400, 'Cancelled challenges cannot be edited');

  const { title, description, associatedSkill, capacity, rules, milestones, visibility } = updateData || {};
  if (title !== undefined) ch.title = title.trim().slice(0, 120);
  if (description !== undefined) ch.description = description.trim().slice(0, 2000);
  if (associatedSkill !== undefined) ch.associatedSkill = associatedSkill.trim().slice(0, 50);
  if (capacity !== undefined) ch.capacity = capacity ? parseInt(capacity, 10) : null;
  if (rules !== undefined && Array.isArray(rules)) ch.rules = rules.map((r) => String(r).trim()).filter(Boolean);
  if (visibility !== undefined) ch.visibility = visibility;
  if (Array.isArray(milestones)) {
    ch.milestones = milestones.map((m, idx) => ({
      _id: m._id || 'ch_ms_demo_' + Date.now() + '_' + idx,
      title: (m.title || '').trim().slice(0, 150),
      description: (m.description || '').trim().slice(0, 500),
      criteria: (m.criteria || '').trim().slice(0, 300),
      order: idx,
    }));
  }

  ch.updatedAt = new Date().toISOString();
  await saveWorkspace(ws);
  return ch;
};

export const cancelDemoChallenge = async (workspaceId, challengeId, reason, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId);
  if (!ch) throw new ApiError(404, 'Challenge not found');

  ch.status = 'CANCELLED';
  ch.updatedAt = new Date().toISOString();
  await saveWorkspace(ws);
  return { message: 'Challenge has been cancelled successfully', status: 'CANCELLED' };
};

export const joinDemoChallenge = async (workspaceId, challengeId, options = {}, user = null) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId);
  if (!ch) throw new ApiError(404, 'Challenge not found');

  if (ch.status === 'CANCELLED') throw new ApiError(400, 'Cannot join a cancelled challenge');

  ws.data.challengeParticipations = ws.data.challengeParticipations || [];
  const existing = ws.data.challengeParticipations.find(
    (p) => p.challenge === challengeId && String(p.user) === String(currentUserId)
  );

  if (existing) {
    if (existing.status !== 'ABANDONED') {
      throw new ApiError(409, 'You have already joined this challenge');
    }
    existing.status = 'IN_PROGRESS';
    existing.joinedAt = new Date().toISOString();
    await saveWorkspace(ws);
    awardDemoAchievement(ws, currentUserId, 'FIRST_CHALLENGE_JOINED', { challengeId, title: ch.title });
    return { message: 'Re-enrolled in challenge successfully', participation: existing };
  }

  const newPart = {
    _id: 'cp_demo_' + Date.now(),
    challenge: challengeId,
    user: currentUserId,
    teamWorkspace: options.teamWorkspaceId || null,
    participationType: ch.participationType,
    status: 'IN_PROGRESS',
    progress: 0,
    completedMilestones: [],
    joinedAt: new Date().toISOString(),
  };

  ws.data.challengeParticipations.push(newPart);

  // Award First Challenge Joined achievement
  awardDemoAchievement(ws, currentUserId, 'FIRST_CHALLENGE_JOINED', { challengeId, title: ch.title });

  await saveWorkspace(ws);
  return { message: 'Joined challenge successfully', participation: newPart };
};

export const leaveDemoChallenge = async (workspaceId, challengeId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const part = (ws.data.challengeParticipations || []).find(
    (p) => p.challenge === challengeId && String(p.user) === String(currentUserId) && p.status !== 'ABANDONED'
  );
  if (!part) throw new ApiError(404, 'You are not an active participant in this challenge');

  part.status = 'ABANDONED';
  await saveWorkspace(ws);
  return { message: 'You have left the challenge' };
};

export const completeDemoMilestone = async (workspaceId, challengeId, milestoneId, note = '', user = null) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId);
  if (!ch) throw new ApiError(404, 'Challenge not found');

  const milestone = (ch.milestones || []).find((m) => m._id === milestoneId);
  if (!milestone) throw new ApiError(404, 'Milestone not found in this challenge');

  let part = (ws.data.challengeParticipations || []).find(
    (p) => p.challenge === challengeId && String(p.user) === String(currentUserId) && p.status !== 'ABANDONED'
  );

  // If team participation check
  if (!part && ch.participationType === 'TEAM') {
    part = (ws.data.challengeParticipations || []).find(
      (p) => p.challenge === challengeId && p.teamWorkspace && p.status !== 'ABANDONED'
    );
  }

  if (!part) throw new ApiError(403, 'Permission denied: You must be an active participant to complete milestones');

  part.completedMilestones = part.completedMilestones || [];
  const alreadyCompleted = part.completedMilestones.some((m) => m.milestoneId === milestoneId);
  if (alreadyCompleted) {
    return {
      message: 'Milestone is already marked as completed',
      participation: part,
      progress: part.progress,
    };
  }

  part.completedMilestones.push({
    milestoneId,
    completedAt: new Date().toISOString(),
    completedBy: currentUserId,
    note: (note || '').trim().slice(0, 300),
  });

  const total = (ch.milestones || []).length;
  const count = part.completedMilestones.length;
  part.progress = total > 0 ? Math.round((count / total) * 100) : 100;

  let isCompleted = false;
  if (count >= total) {
    part.status = 'COMPLETED';
    part.completedAt = new Date().toISOString();
    isCompleted = true;
  }

  // Award achievements
  awardDemoAchievement(ws, currentUserId, 'FIRST_CHALLENGE_MILESTONE', { challengeId, milestoneId, title: milestone.title });

  if (isCompleted) {
    awardDemoAchievement(ws, currentUserId, 'FIRST_CHALLENGE_COMPLETED', { challengeId, title: ch.title });
    if (part.participationType === 'TEAM') {
      awardDemoAchievement(ws, currentUserId, 'FIRST_TEAM_CHALLENGE_COMPLETED', { challengeId, teamWorkspace: part.teamWorkspace, title: ch.title });
    }
  }

  await saveWorkspace(ws);
  return {
    message: isCompleted ? '🎉 Congratulations! Challenge completed!' : 'Milestone marked as complete',
    participation: part,
    progress: part.progress,
    isCompleted,
  };
};

export const undoDemoMilestone = async (workspaceId, challengeId, milestoneId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId);
  if (!ch) throw new ApiError(404, 'Challenge not found');

  const part = (ws.data.challengeParticipations || []).find(
    (p) => p.challenge === challengeId && (String(p.user) === String(currentUserId) || p.teamWorkspace) && p.status !== 'ABANDONED'
  );
  if (!part) throw new ApiError(403, 'Permission denied');

  part.completedMilestones = (part.completedMilestones || []).filter((m) => m.milestoneId !== milestoneId);
  const total = (ch.milestones || []).length;
  part.progress = total > 0 ? Math.round((part.completedMilestones.length / total) * 100) : 0;
  part.status = 'IN_PROGRESS';
  part.completedAt = null;

  await saveWorkspace(ws);
  return { message: 'Milestone progress reverted', participation: part, progress: part.progress };
};

export const createDemoChallengeUpdate = async (workspaceId, challengeId, updateData, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const currentUserId = user?._id || ws.userId || DEMO_USER_ID;
  const ch = (ws.data.communityChallenges || []).find((c) => c._id === challengeId);
  if (!ch) throw new ApiError(404, 'Challenge not found');

  const { content, milestone, evidenceUrl, teamWorkspaceId } = updateData || {};
  const cleanContent = (content || '').trim();
  if (!cleanContent) throw new ApiError(400, 'Update message cannot be empty');

  const newUpdate = {
    _id: 'cup_demo_' + Date.now(),
    challenge: challengeId,
    user: {
      _id: currentUserId,
      name: user?.name || ws.data.profile?.name || 'Alex Morgan',
      avatar: user?.avatar || ws.data.profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    },
    teamWorkspace: teamWorkspaceId || null,
    milestone: milestone || null,
    content: cleanContent,
    evidenceUrl: evidenceUrl || '',
    createdAt: new Date().toISOString(),
  };

  ws.data.challengeUpdates = ws.data.challengeUpdates || [];
  ws.data.challengeUpdates.unshift(newUpdate);
  await saveWorkspace(ws);
  return newUpdate;
};

export const getDemoChallengeUpdates = async (workspaceId, challengeId, pagination = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const updates = (ws.data.challengeUpdates || []).filter((u) => u.challenge === challengeId);

  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const start = (page - 1) * limit;
  const paginated = updates.slice(start, start + limit);

  return {
    updates: paginated,
    pagination: {
      page,
      limit,
      total: updates.length,
      totalPages: Math.ceil(updates.length / limit) || 1,
    },
  };
};

export const deleteDemoChallengeUpdate = async (workspaceId, challengeId, updateId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  ws.data.challengeUpdates = (ws.data.challengeUpdates || []).filter(
    (u) => !(u._id === updateId && u.challenge === challengeId)
  );
  await saveWorkspace(ws);
  return { message: 'Update removed successfully' };
};

export const getUserDemoAchievements = async (workspaceId, user) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const unlocked = ws.data.userAchievements || [];
  const unlockedKeys = new Set(unlocked.map((a) => a.achievementKey));

  const allAchievements = Object.values(ACHIEVEMENT_DEFINITIONS).map((def) => {
    const found = unlocked.find((u) => u.achievementKey === def.key);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      isUnlocked: unlockedKeys.has(def.key),
      unlockedAt: found ? found.unlockedAt : null,
      metadata: found ? found.metadata : null,
    };
  });

  return {
    achievements: allAchievements,
    unlockedCount: unlocked.length,
    totalCount: Object.keys(ACHIEVEMENT_DEFINITIONS).length,
  };
};

/** ==========================================================================
 * UNIVERSAL DISCOVERY & SEARCH (SANDBOX ISOLATED)
 * ========================================================================== */

export const searchInWorkspace = async (workspaceId, query = {}) => {
  const ws = await getOrCreateWorkspace(workspaceId);
  const {
    q = '',
    category,
    level,
    availability,
    language,
    teachableSkill,
    desiredSkill,
    sortBy = 'relevance',
  } = query;
  const term = q.trim().toLowerCase();

  // 1. Skills taxonomy from demo baseline
  const baselineSkills = [
    { name: 'React', category: 'Frontend' },
    { name: 'Node.js', category: 'Backend' },
    { name: 'UI/UX Design', category: 'Design' },
    { name: 'Figma Prototyping', category: 'Design' },
    { name: 'Docker', category: 'DevOps' },
    { name: 'Python', category: 'Backend' },
    { name: 'System Design', category: 'Architecture' },
    { name: 'Microservices', category: 'Architecture' },
  ];
  const skills = baselineSkills.filter((s) => {
    if (term && !s.name.toLowerCase().includes(term) && !s.category.toLowerCase().includes(term)) return false;
    if (category && s.category.toLowerCase() !== category.toLowerCase()) return false;
    return true;
  });

  // 2. People (from demo matches / peers)
  const candidates = (ws.data.matches || []).map((m) => m.candidate).filter(Boolean);
  let people = candidates.filter((p) => {
    if (term) {
      const matchName = p.name?.toLowerCase().includes(term);
      const matchBio = p.bio?.toLowerCase().includes(term);
      const matchSkill = p.skills?.some((s) => s.name?.toLowerCase().includes(term));
      if (!matchName && !matchBio && !matchSkill) return false;
    }
    if (teachableSkill) {
      const tLower = teachableSkill.toLowerCase();
      const hasTeach = p.skills?.some(
        (s) => (s.type === 'TEACH' || s.type === 'both' || !s.type) && s.name?.toLowerCase().includes(tLower)
      );
      if (!hasTeach) return false;
    }
    if (desiredSkill) {
      const dLower = desiredSkill.toLowerCase();
      const hasLearn = p.learningInterests?.some((i) => i.name?.toLowerCase().includes(dLower));
      if (!hasLearn) return false;
    }
    if (level && !p.skills?.some((s) => s.level?.toUpperCase() === level.toUpperCase())) return false;
    if (availability && (p.availability || 'flexible').toLowerCase() !== availability.toLowerCase()) return false;
    if (language && !p.languages?.some((l) => l.toLowerCase() === language.toLowerCase())) return false;
    return true;
  }).map((p) => ({
    _id: p._id,
    name: p.name,
    avatar: p.avatar,
    bio: p.bio,
    skills: p.skills || [],
    learningInterests: p.learningInterests || [],
    availability: p.availability || 'flexible',
    timezone: p.timezone || 'UTC',
    experienceLevel: p.experienceLevel || 'INTERMEDIATE',
    reputation: p.reputation || { averageRating: 5.0, reviewCount: 1 },
  }));

  // Sorting
  if (sortBy === 'rating') {
    people.sort((a, b) => (b.reputation?.averageRating || 0) - (a.reputation?.averageRating || 0));
  } else if (sortBy === 'recent') {
    people.reverse();
  }

  // 3. Goals
  const goals = (ws.data.goals || []).filter((g) => {
    if (term) {
      const matchTitle = g.title?.toLowerCase().includes(term);
      const matchDesc = g.description?.toLowerCase().includes(term);
      const matchSkill = g.requiredSkills?.some((s) => s.name?.toLowerCase().includes(term));
      return matchTitle || matchDesc || matchSkill;
    }
    return true;
  });

  // 4. Challenges
  const challenges = (ws.data.challenges || []).filter((ch) => {
    if (ch.visibility === 'PRIVATE' || ch.isArchived) return false;
    if (term) {
      const matchTitle = ch.title?.toLowerCase().includes(term);
      const matchDesc = ch.description?.toLowerCase().includes(term);
      const matchSkill = ch.associatedSkill?.toLowerCase().includes(term);
      return matchTitle || matchDesc || matchSkill;
    }
    return true;
  });

  // 5. Workspaces
  const workspaces = (ws.data.workspaces || []).filter((w) => {
    if (w.visibility === 'PRIVATE') return false;
    if (term) {
      const matchTitle = w.title?.toLowerCase().includes(term);
      const matchDesc = w.description?.toLowerCase().includes(term);
      const matchSkill = w.associatedSkill?.toLowerCase().includes(term);
      return matchTitle || matchDesc || matchSkill;
    }
    return true;
  });

  return {
    skills,
    people,
    goals,
    challenges,
    workspaces,
    pagination: {
      page: 1,
      limit: 20,
      totalCount: people.length + challenges.length + workspaces.length + goals.length,
    },
  };
};



