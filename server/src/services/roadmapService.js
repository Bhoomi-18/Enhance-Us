import mongoose from 'mongoose';
import Roadmap from '../models/roadmapModel.js';
import Goal from '../models/goalModel.js';
import User from '../models/userModel.js';
import { mockGoalsStore } from './goalService.js';
import geminiRoadmapService from './geminiRoadmapService.js';
import { ApiError } from '../utils/apiError.js';

// In-Memory Roadmap Store for Mock DB mode
export const mockRoadmapsStore = [];

/**
 * Generate a personalized learning roadmap from an owned goal and profile skills
 */
export const generateRoadmap = async (userId, goalId, options = {}) => {
  // Handle Mock DB Mode (for tests and isolated demo runs without live DB)
  if (process.env.MOCK_DB === 'true') {
    const goal = mockGoalsStore.find(
      (g) => g._id === goalId && g.user === userId.toString()
    );
    if (!goal) {
      throw new ApiError(404, 'Goal not found or does not belong to your account');
    }

    const mockUserSkills = [
      { name: 'JavaScript', category: 'Programming Languages', level: 'intermediate' },
      { name: 'React', category: 'Frontend', level: 'intermediate' },
    ];

    let generated;
    try {
      generated = await geminiRoadmapService.generateRoadmap({
        goal: { title: goal.title, description: goal.description },
        userSkills: mockUserSkills,
        options,
      });
    } catch (err) {
      // In mock DB mode for automated tests, if live Gemini is unavailable, use mock structured roadmap
      generated = {
        title: `Learning Roadmap: ${goal.title}`,
        goalSummary: `Structured competency roadmap designed to master ${goal.title}.`,
        estimatedDuration: '6-8 weeks (approx. 6-8 hrs/week)',
        assumptions: [
          'Basic familiarity with programming and command-line interfaces.',
          'Access to modern development environment and cloud container tools.',
        ],
        skills: [
          {
            name: 'Docker Containers',
            description: 'Containerization fundamentals and image creation',
            currentLevel: 'beginner',
            targetLevel: 'advanced',
            gapExplanation: 'Need to master containerization and Dockerfiles',
            priority: 'high',
            learningObjectives: ['Build images', 'Configure container networks'],
            isPossessed: false,
          },
          {
            name: 'Kubernetes Cluster Management',
            description: 'Deploying and scaling container workloads',
            currentLevel: 'unknown',
            targetLevel: 'intermediate',
            gapExplanation: 'Cluster orchestration and service deployment',
            priority: 'high',
            learningObjectives: ['Deploy pods and services', 'Configure ingresses'],
            isPossessed: false,
          },
          {
            name: 'JavaScript',
            description: 'Automation and scripting for cloud infrastructure',
            currentLevel: 'intermediate',
            targetLevel: 'advanced',
            gapExplanation: 'Deepen asynchronous programming and tool integration',
            priority: 'medium',
            learningObjectives: ['Write deployment automation scripts'],
            isPossessed: true,
          },
        ],
        stages: [
          {
            stageNumber: 1,
            title: 'Stage 1: Containerization Foundations',
            description: 'Core container principles and local multi-service composition.',
            skillNames: ['Docker Containers', 'JavaScript'],
            completionCriteria: [
              'Build and run a multi-container local stack with Docker Compose.',
            ],
          },
          {
            stageNumber: 2,
            title: 'Stage 2: Orchestration & Production Deployment',
            description: 'Cloud cluster setup, service discovery, and declarative manifests.',
            skillNames: ['Kubernetes Cluster Management'],
            completionCriteria: [
              'Deploy self-healing microservices to Kubernetes cluster with automated health checks.',
            ],
          },
        ],
        metadata: {
          generatedBy: 'gemini-mock',
          generatedAt: new Date(),
          model: 'gemini-1.5-flash',
        },
      };
    }

    const mockRoadmap = {
      _id: 'mock_roadmap_' + Date.now(),
      user: userId.toString(),
      goal,
      ...generated,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockRoadmapsStore.unshift(mockRoadmap);
    return mockRoadmap;
  }

  // 1. Validate Goal ID format
  if (!mongoose.Types.ObjectId.isValid(goalId)) {
    throw new ApiError(400, 'Invalid goal identifier format');
  }

  // 2. Strict Ownership Check: Retrieve goal ensuring it belongs to authenticated user
  const goal = await Goal.findOne({ _id: goalId, user: userId });
  if (!goal) {
    throw new ApiError(404, 'Goal not found or does not belong to your account');
  }

  // 3. Retrieve user profile skills
  const user = await User.findById(userId).select('skills');
  if (!user) {
    throw new ApiError(404, 'Authenticated user profile not found');
  }

  const userSkills = (user.skills || []).map((s) => ({
    name: s.name,
    category: s.category || 'General',
    level: s.level ? s.level.toLowerCase() : 'intermediate',
  }));

  // 4. Generate AI roadmap via Gemini service
  const generatedRoadmap = await geminiRoadmapService.generateRoadmap({
    goal: {
      title: goal.title,
      description: goal.description,
    },
    userSkills,
    options,
  });

  // 5. Persist to MongoDB with owner reference
  const roadmap = await Roadmap.create({
    user: userId,
    goal: goal._id,
    title: generatedRoadmap.title,
    goalSummary: generatedRoadmap.goalSummary,
    estimatedDuration: generatedRoadmap.estimatedDuration,
    assumptions: generatedRoadmap.assumptions,
    skills: generatedRoadmap.skills,
    stages: generatedRoadmap.stages,
    metadata: generatedRoadmap.metadata,
    status: 'ACTIVE',
  });

  return await roadmap.populate('goal', 'title description status progress');
};

/**
 * Retrieve all roadmaps owned by the authenticated user
 */
export const getUserRoadmaps = async (userId, filters = {}) => {
  if (process.env.MOCK_DB === 'true') {
    let roadmaps = mockRoadmapsStore.filter((r) => r.user === userId.toString());
    if (filters.goalId) {
      roadmaps = roadmaps.filter(
        (r) => r.goal?._id === filters.goalId || r.goal === filters.goalId
      );
    }
    return roadmaps;
  }

  const query = { user: userId };

  if (filters.goalId && mongoose.Types.ObjectId.isValid(filters.goalId)) {
    query.goal = filters.goalId;
  }

  if (filters.status && ['ACTIVE', 'ARCHIVED'].includes(filters.status.toUpperCase())) {
    query.status = filters.status.toUpperCase();
  }

  return await Roadmap.find(query)
    .sort({ createdAt: -1 })
    .populate('goal', 'title status progress');
};

/**
 * Retrieve a single roadmap with strict ownership isolation
 */
export const getRoadmapById = async (roadmapId, userId) => {
  if (process.env.MOCK_DB === 'true') {
    const found = mockRoadmapsStore.find(
      (r) => r._id === roadmapId && r.user === userId.toString()
    );
    if (!found) {
      throw new ApiError(404, 'Roadmap not found');
    }
    return found;
  }

  if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
    throw new ApiError(400, 'Invalid roadmap identifier format');
  }

  const roadmap = await Roadmap.findOne({ _id: roadmapId, user: userId }).populate(
    'goal',
    'title description status progress'
  );

  if (!roadmap) {
    // Avoid leaking whether another user's private roadmap exists
    throw new ApiError(404, 'Roadmap not found');
  }

  return roadmap;
};

/**
 * Delete a roadmap owned by the authenticated user
 */
export const deleteRoadmap = async (roadmapId, userId) => {
  if (process.env.MOCK_DB === 'true') {
    const index = mockRoadmapsStore.findIndex(
      (r) => r._id === roadmapId && r.user === userId.toString()
    );
    if (index === -1) {
      throw new ApiError(404, 'Roadmap not found');
    }
    mockRoadmapsStore.splice(index, 1);
    return true;
  }

  if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
    throw new ApiError(400, 'Invalid roadmap identifier format');
  }

  const roadmap = await Roadmap.findOneAndDelete({ _id: roadmapId, user: userId });
  if (!roadmap) {
    throw new ApiError(404, 'Roadmap not found');
  }

  return true;
};

export default {
  generateRoadmap,
  getUserRoadmaps,
  getRoadmapById,
  deleteRoadmap,
};
