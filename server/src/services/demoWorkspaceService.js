import crypto from 'crypto';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { getCanonicalBaseline, BASELINE_VERSION, DEMO_USER_ID } from '../fixtures/canonicalDemoBaseline.js';
import { ApiError } from '../utils/apiError.js';
import calculateSkillGaps from './skillGapEngine.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';

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


