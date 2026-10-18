import Goal from '../models/goalModel.js';
import User from '../models/userModel.js';
import goalAnalysisService from './goalAnalysisService.js';
import calculateSkillGaps from './skillGapEngine.js';
import { ApiError } from '../utils/apiError.js';

// In-Memory Goal Store for Mock DB mode
const mockGoalsStore = [];

/**
 * Preview goal decomposition and skill-gap analysis without saving
 */
export const previewGoalAnalysis = async (userId, { title, description }) => {
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    throw new ApiError(400, 'Goal description is required for analysis');
  }

  // Handle Mock DB Mode
  if (process.env.MOCK_DB === 'true') {
    const mockUserSkills = [
      { name: 'React', level: 'ADVANCED', category: 'Frontend' },
      { name: 'Node.js', level: 'INTERMEDIATE', category: 'Backend' },
    ];

    const analysisResult = await goalAnalysisService.analyzeGoal(description);
    const requiredSkills = analysisResult.requiredSkills || [];
    const aiAnalysis = analysisResult.aiAnalysis || null;
    const gaps = calculateSkillGaps(mockUserSkills, requiredSkills);

    return {
      title: (title || '').trim(),
      description: description.trim(),
      requiredSkills,
      aiAnalysis,
      userSkillsSnapshot: mockUserSkills,
      skillGaps: gaps,
      progress: gaps.progress,
    };
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const analysisResult = await goalAnalysisService.analyzeGoal(description);
  const requiredSkills = analysisResult.requiredSkills || [];
  const aiAnalysis = analysisResult.aiAnalysis || null;

  const userSkillsSnapshot = (user.skills || []).map((s) => ({
    name: s.name,
    category: s.category || 'General',
    level: (s.level || 'INTERMEDIATE').toUpperCase(),
  }));

  const gaps = calculateSkillGaps(userSkillsSnapshot, requiredSkills);

  return {
    title: (title || '').trim(),
    description: description.trim(),
    requiredSkills,
    aiAnalysis,
    userSkillsSnapshot,
    skillGaps: gaps,
    progress: gaps.progress,
  };
};

export const createGoal = async (userId, goalData) => {
  const { title, description, status } = goalData;

  if (!title || !description) {
    throw new ApiError(400, 'Title and description are required to create a goal');
  }

  // Handle Mock DB Mode
  if (process.env.MOCK_DB === 'true') {
    const mockUserSkills = [
      { name: 'React', level: 'ADVANCED', category: 'Frontend' },
      { name: 'Node.js', level: 'INTERMEDIATE', category: 'Backend' },
    ];

    const analysisResult = await goalAnalysisService.analyzeGoal(description);
    const requiredSkills = analysisResult.requiredSkills || [];
    const aiAnalysis = analysisResult.aiAnalysis || null;
    const gaps = calculateSkillGaps(mockUserSkills, requiredSkills);

    const newMockGoal = {
      _id: 'mock_goal_' + Date.now(),
      user: userId.toString(),
      title: title.trim(),
      description: description.trim(),
      status: status || 'ACTIVE',
      requiredSkills,
      aiAnalysis,
      userSkillsSnapshot: mockUserSkills,
      skillGaps: gaps,
      progress: gaps.progress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockGoalsStore.push(newMockGoal);
    return newMockGoal;
  }

  // Retrieve user to snapshot profile skills
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Analyze goal description to extract required skills and rich AI roadmap
  const analysisResult = await goalAnalysisService.analyzeGoal(description);
  const requiredSkills = analysisResult.requiredSkills || [];
  const aiAnalysis = analysisResult.aiAnalysis || null;

  // Snapshot user's current skills
  const userSkillsSnapshot = (user.skills || []).map((s) => ({
    name: s.name,
    category: s.category || 'General',
    level: (s.level || 'INTERMEDIATE').toUpperCase(),
  }));

  // Calculate deterministic skill gap matrix and progress
  const gaps = calculateSkillGaps(userSkillsSnapshot, requiredSkills);

  // Save Goal to MongoDB
  const goal = await Goal.create({
    user: userId,
    title: title.trim(),
    description: description.trim(),
    status: status || 'ACTIVE',
    requiredSkills,
    aiAnalysis,
    userSkillsSnapshot,
    skillGaps: gaps,
    progress: gaps.progress,
  });

  return goal;
};

export const getUserGoals = async (userId, statusFilter) => {
  if (process.env.MOCK_DB === 'true') {
    let userMockGoals = mockGoalsStore.filter((g) => g.user === userId.toString());
    if (statusFilter) {
      userMockGoals = userMockGoals.filter((g) => g.status === statusFilter);
    }
    return userMockGoals;
  }

  const filter = { user: userId };
  if (statusFilter) {
    filter.status = statusFilter;
  }

  return await Goal.find(filter).sort({ createdAt: -1 });
};

export const getGoalById = async (goalId, userId) => {
  if (process.env.MOCK_DB === 'true') {
    const goal = mockGoalsStore.find(
      (g) => g._id === goalId && g.user === userId.toString()
    );
    if (!goal) {
      throw new ApiError(404, 'Goal not found or access denied');
    }
    return goal;
  }

  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found or access denied');
  }

  return goal;
};

export const updateGoal = async (goalId, userId, updateData) => {
  if (process.env.MOCK_DB === 'true') {
    const goalIndex = mockGoalsStore.findIndex(
      (g) => g._id === goalId && g.user === userId.toString()
    );
    if (goalIndex === -1) {
      throw new ApiError(404, 'Goal not found or access denied');
    }

    if (updateData.title) mockGoalsStore[goalIndex].title = updateData.title.trim();
    if (updateData.status) mockGoalsStore[goalIndex].status = updateData.status;

    if (updateData.description && updateData.description.trim() !== mockGoalsStore[goalIndex].description) {
      mockGoalsStore[goalIndex].description = updateData.description.trim();
      const mockUserSkills = [
        { name: 'React', level: 'ADVANCED', category: 'Frontend' },
        { name: 'Node.js', level: 'INTERMEDIATE', category: 'Backend' },
      ];
      const analysisResult = await goalAnalysisService.analyzeGoal(mockGoalsStore[goalIndex].description);
      const requiredSkills = analysisResult.requiredSkills || [];
      const gaps = calculateSkillGaps(mockUserSkills, requiredSkills);
      mockGoalsStore[goalIndex].requiredSkills = requiredSkills;
      mockGoalsStore[goalIndex].aiAnalysis = analysisResult.aiAnalysis || null;
      mockGoalsStore[goalIndex].skillGaps = gaps;
      mockGoalsStore[goalIndex].progress = gaps.progress;
    }

    mockGoalsStore[goalIndex].updatedAt = new Date().toISOString();
    return mockGoalsStore[goalIndex];
  }

  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found or access denied');
  }

  if (updateData.title) goal.title = updateData.title.trim();
  if (updateData.status) goal.status = updateData.status;

  // Re-analyze skills if description is changed
  if (updateData.description && updateData.description.trim() !== goal.description) {
    goal.description = updateData.description.trim();
    const user = await User.findById(userId);

    const analysisResult = await goalAnalysisService.analyzeGoal(goal.description);
    const requiredSkills = analysisResult.requiredSkills || [];
    const aiAnalysis = analysisResult.aiAnalysis || null;

    const userSkillsSnapshot = (user.skills || []).map((s) => ({
      name: s.name,
      category: s.category || 'General',
      level: (s.level || 'INTERMEDIATE').toUpperCase(),
    }));

    const gaps = calculateSkillGaps(userSkillsSnapshot, requiredSkills);
    goal.requiredSkills = requiredSkills;
    goal.aiAnalysis = aiAnalysis;
    goal.userSkillsSnapshot = userSkillsSnapshot;
    goal.skillGaps = gaps;
    goal.progress = gaps.progress;
  }

  await goal.save();
  return goal;
};

export const deleteGoal = async (goalId, userId) => {
  if (process.env.MOCK_DB === 'true') {
    const goalIndex = mockGoalsStore.findIndex(
      (g) => g._id === goalId && g.user === userId.toString()
    );
    if (goalIndex === -1) {
      throw new ApiError(404, 'Goal not found or access denied');
    }
    mockGoalsStore.splice(goalIndex, 1);
    return { success: true };
  }

  const goal = await Goal.findOneAndDelete({ _id: goalId, user: userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found or access denied');
  }

  return { success: true };
};
