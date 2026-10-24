import mongoose from 'mongoose';
import CoachRecommendation from '../models/coachRecommendationModel.js';
import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import { mockGoalsStore } from './goalService.js';
import Roadmap from '../models/roadmapModel.js';
import { mockRoadmapsStore } from './roadmapService.js';
import Circle from '../models/circleModel.js';
import { mockCirclesStore } from './circleService.js';
import Session from '../models/sessionModel.js';
import { mockSessionsStore } from './sessionService.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';
import { ApiError } from '../utils/apiError.js';
import { GoogleGenAI } from '@google/genai';

// In-Memory store for mock DB mode and offline test execution
export const mockCoachRecommendationsStore = [];

/**
 * Sanitize prompt text to remove script tags and control characters
 */
const sanitizeInput = (text, maxLength = 1000) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maxLength);
};

/**
 * Helper: Find user in DB or mock store
 */
const getUserData = async (userId) => {
  const userIdStr = (userId?._id || userId || '').toString();
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return {
      _id: userIdStr,
      name: 'Test Learner',
      email: 'learner@enhanceus.test',
      experienceLevel: 'INTERMEDIATE',
      skills: [
        { name: 'React', level: 'INTERMEDIATE', type: 'TEACH' },
        { name: 'JavaScript', level: 'INTERMEDIATE', type: 'TEACH' },
      ],
      learningInterests: [{ name: 'Node.js', priority: 'HIGH' }, { name: 'TypeScript', priority: 'MEDIUM' }],
      isDemo: false,
    };
  }
  return await User.findById(userIdStr).lean();
};

/**
 * Helper: Find active goals for user
 */
const getUserGoals = async (userId) => {
  const userIdStr = (userId?._id || userId || '').toString();
  if (process.env.MOCK_DB === 'true' && Goal.db?.readyState !== 1) {
    return mockGoalsStore.filter((g) => {
      const gUserId = (g.user?._id || g.user || '').toString();
      return gUserId === userIdStr && g.status !== 'COMPLETED';
    });
  }
  return await Goal.find({ user: userIdStr, status: { $ne: 'COMPLETED' } }).lean();
};

/**
 * Helper: Find active roadmaps for user
 */
const getUserRoadmaps = async (userId) => {
  const userIdStr = (userId?._id || userId || '').toString();
  if (process.env.MOCK_DB === 'true' && Roadmap.db?.readyState !== 1) {
    return mockRoadmapsStore.filter((r) => {
      const rUserId = (r.user?._id || r.user || '').toString();
      return rUserId === userIdStr;
    });
  }
  return await Roadmap.find({ user: userIdStr }).lean();
};

/**
 * Helper: Find available active circles
 */
const getAvailableCircles = async () => {
  if (process.env.MOCK_DB === 'true' && Circle.db?.readyState !== 1) {
    return mockCirclesStore.filter((c) => c.status === 'ACTIVE');
  }
  return await Circle.find({ status: 'ACTIVE' }).lean();
};

/**
 * Deterministic Recommendation Engine
 * Generates tailored, actionable steps based on authentic persisted records
 */
export const generateDeterministicRecommendations = (user, goals = [], roadmaps = [], circles = [], dismissedTopics = new Set()) => {
  const recommendations = [];
  const userInterests = (user?.learningInterests || []).map((i) => normalizeSkillName(i.name || ''));
  const userSkills = (user?.skills || []).map((s) => normalizeSkillName(s.name || ''));

  const isDismissed = (title, skill = '') => {
    const lowTitle = (title || '').toLowerCase().trim();
    const lowSkill = (skill || '').toLowerCase().trim();
    for (const d of dismissedTopics) {
      const lowD = (d || '').toLowerCase().trim();
      if (!lowD) continue;
      if (lowTitle === lowD || (lowSkill && lowSkill === lowD)) return true;
      if (lowTitle.includes(lowD) || lowD.includes(lowTitle)) return true;
    }
    return false;
  };

  // 1. Inspect Active Roadmaps and Incomplete Milestones
  let foundMilestoneRecommendation = false;
  for (const roadmap of roadmaps) {
    const stages = roadmap.stages || [];
    for (const stage of stages) {
      const milestones = stage.milestones || [];
      for (const milestone of milestones) {
        if (!milestone.isCompleted) {
          const milestoneTitle = milestone.title || 'Next Skill Module';
          const normalizedMilestoneSkill = normalizeSkillName(milestone.skillName || roadmap.title || '');

          if (isDismissed(milestoneTitle, normalizedMilestoneSkill)) {
            continue;
          }

          // Check prerequisites
          const prereqs = milestone.prerequisites || [];
          const missingPrereqs = prereqs.filter((p) => {
            const pNorm = normalizeSkillName(p);
            return !userSkills.includes(pNorm);
          });

          if (missingPrereqs.length > 0) {
            const prereqTitle = `Prerequisite Check: Review ${missingPrereqs[0]} before tackling ${milestoneTitle}`;
            if (!isDismissed(prereqTitle, missingPrereqs[0])) {
              recommendations.push({
                type: 'PREREQUISITE_PRACTICE',
                title: prereqTitle,
                content: `To build confidence for "${milestoneTitle}", we recommend reviewing fundamental concepts in ${missingPrereqs[0]} first. Try writing a quick 20-line test or reviewing core docs.`,
                rationale: `Identified that ${missingPrereqs[0]} is listed as a prerequisite for milestone "${milestoneTitle}" in roadmap "${roadmap.title}".`,
                associatedSkill: missingPrereqs[0],
                associatedGoal: roadmap.goal || null,
                associatedMilestoneId: (milestone._id || milestone.id || '').toString(),
                isAiGenerated: false,
                actionMetadata: { roadmapId: roadmap._id, milestoneTitle },
              });
              foundMilestoneRecommendation = true;
              break;
            }
          } else {
            const nextStepTitle = `Next Up: Complete "${milestoneTitle}"`;
            if (!isDismissed(nextStepTitle, normalizedMilestoneSkill)) {
              recommendations.push({
                type: 'MILESTONE_NEXT_STEP',
                title: nextStepTitle,
                content: milestone.description
                  ? `Take action on: ${milestone.description}. Document your learning notes upon completion.`
                  : `Focus your next study session on mastering "${milestoneTitle}". Break it down into 30-minute focused sprints.`,
                rationale: `This is the immediate next actionable milestone in your active roadmap "${roadmap.title}". All prerequisite dependencies are satisfied.`,
                associatedSkill: normalizedMilestoneSkill,
                associatedGoal: roadmap.goal || null,
                associatedMilestoneId: (milestone._id || milestone.id || '').toString(),
                isAiGenerated: false,
                actionMetadata: { roadmapId: roadmap._id, milestoneTitle },
              });
              foundMilestoneRecommendation = true;
              break;
            }
          }
        }
      }
      if (foundMilestoneRecommendation) break;
    }
  }

  // 2. Learning Circle Recommendations for declared interests
  for (const circle of circles) {
    const primaryNorm = normalizeSkillName(circle.primarySkill || '');
    const isInterestMatch = userInterests.includes(primaryNorm);
    const isMember = (circle.members || []).some(
      (m) => (m.user?._id || m.user || '').toString() === (user?._id || '').toString()
    );

    const circleTitle = `Join Community Circle: "${circle.title}"`;
    if (isInterestMatch && !isMember && !isDismissed(circleTitle, primaryNorm)) {
      recommendations.push({
        type: 'LEARNING_CIRCLE',
        title: circleTitle,
        content: `Connect with peers in this active learning circle focusing on ${circle.primarySkill}. Participate in weekly group sessions and milestone discussions.`,
        rationale: `Matches your declared learning interest in ${circle.primarySkill}. Collaborative learning circles improve completion rates by up to 60%.`,
        associatedSkill: circle.primarySkill,
        isAiGenerated: false,
        actionMetadata: { circleId: circle._id, primarySkill: circle.primarySkill },
      });
      break; // 1 circle recommendation is enough per refresh
    }
  }

  // 3. Practical Exercise / Project Idea for declared skills
  const targetInterest = userInterests[0] || (goals[0]?.requiredSkills?.[0]?.name) || 'Modern Web Development';
  const exerciseTitle = `Hands-on Exercise: Build a Modular ${targetInterest} Utility`;
  if (!isDismissed(exerciseTitle, targetInterest)) {
    recommendations.push({
      type: 'PRACTICAL_EXERCISE',
      title: exerciseTitle,
      content: `Create a standalone mini-project applying ${targetInterest} concepts. Structure your code with clean separation of concerns, handle edge cases, and add README documentation.`,
      rationale: `Practical coding exercises solidify conceptual knowledge into verified proof-of-skill portfolio evidence.`,
      associatedSkill: targetInterest,
      associatedGoal: goals[0]?._id || null,
      isAiGenerated: false,
      actionMetadata: { topic: targetInterest, type: 'PORTFOLIO_READY' },
    });
  }

  // 4. Fallback if user profile has zero goals or roadmap data
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'GOAL_REFINEMENT',
      title: 'Define Your First Targeted Learning Goal',
      content: 'Define a specific learning goal (e.g., "Build production REST APIs with Node.js & TypeScript") in your dashboard to generate an adaptive roadmap and milestone breakdown.',
      rationale: 'Personalized recommendations require at least one target skill or goal. Defining a goal unlocks automated roadmap milestones and matching.',
      associatedSkill: 'Goal Setting',
      isAiGenerated: false,
      actionMetadata: { isInitialPrompt: true },
    });
  }

  return recommendations;
};

/**
 * Call Gemini AI if configured with timeout protection and schema validation
 */
const generateGeminiRecommendations = async (user, goals, roadmaps, circles, dismissedTopics) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim() || process.env.MOCK_DB === 'true') {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = ai.getGenerativeModel ? ai.getGenerativeModel({ model: 'gemini-1.5-flash' }) : ai;

    const userSummary = {
      experienceLevel: user?.experienceLevel || 'INTERMEDIATE',
      learningInterests: (user?.learningInterests || []).map((i) => i.name).slice(0, 5),
      currentGoals: goals.map((g) => ({ title: g.title, requiredSkills: (g.requiredSkills || []).map((s) => s.name) })),
      activeRoadmaps: roadmaps.map((r) => r.title),
      dismissedTopics: Array.from(dismissedTopics).slice(0, 10),
    };

    const prompt = `You are the EnhanceUs Adaptive AI Learning Coach. 
Learner Context (do not repeat private info):
${JSON.stringify(userSummary, null, 2)}

Provide exactly 3 personalized, highly actionable learning recommendations.
Rules:
1. Provide concrete, small next steps (not generic motivational platitudes).
2. For each recommendation, provide an explicit rationale explaining why it is relevant based on their goals/interests.
3. Do NOT recommend any items listed in dismissedTopics.
4. Output strictly valid JSON matching this schema:
[
  {
    "type": "MILESTONE_NEXT_STEP" | "PREREQUISITE_PRACTICE" | "PRACTICAL_EXERCISE" | "PROJECT_IDEA" | "LEARNING_CIRCLE" | "GOAL_REFINEMENT",
    "title": "string (under 120 chars)",
    "content": "string (actionable guidance, 1-3 sentences)",
    "rationale": "string (clear reason why this is recommended)",
    "associatedSkill": "string"
  }
]
No markdown wrapping, no explanation text outside the JSON array.`;

    // Timeout promise for Gemini request (6 seconds maximum)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI provider timeout')), 6000)
    );

    const callPromise = (async () => {
      let rawText = '';
      if (model.generateContent) {
        const result = await model.generateContent(prompt);
        rawText = result?.response?.text() || '';
      } else if (ai.models?.generateContent) {
        const result = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        rawText = result?.text || '';
      }
      return rawText;
    })();

    const rawResponse = await Promise.race([callPromise, timeoutPromise]);
    const cleanedJson = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const allowedTypes = new Set([
        'MILESTONE_NEXT_STEP',
        'PREREQUISITE_PRACTICE',
        'PRACTICAL_EXERCISE',
        'PROJECT_IDEA',
        'EXCHANGE_PARTNER',
        'LEARNING_CIRCLE',
        'GOAL_REFINEMENT',
      ]);

      const validated = parsed
        .filter((item) => item.title && item.content && item.rationale && allowedTypes.has(item.type))
        .map((item) => ({
          type: item.type,
          title: sanitizeInput(item.title, 150),
          content: sanitizeInput(item.content, 2000),
          rationale: sanitizeInput(item.rationale, 800),
          associatedSkill: sanitizeInput(item.associatedSkill || '', 80),
          isAiGenerated: true,
        }));

      if (validated.length > 0) {
        return validated;
      }
    }
  } catch (err) {
    console.warn('[Coach AI Warning] Gemini recommendation generation skipped, using deterministic fallback:', err.message);
  }

  return null;
};

/**
 * Get or refresh personalized recommendations for user
 */
export const getPersonalizedRecommendations = async (userId, options = {}) => {
  const { forceRefresh = false } = options;
  const userIdStr = (userId?._id || userId || '').toString();

  // 1. Fetch user data and check existing pending/accepted recommendations
  const user = await getUserData(userIdStr);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Retrieve past dismissed topics within last 30 days to avoid repeats
  let dismissedTopics = new Set();
  let existingRecommendations = [];

  if (process.env.MOCK_DB === 'true' && CoachRecommendation.db?.readyState !== 1) {
    const userRecs = mockCoachRecommendationsStore.filter(
      (r) => (r.user?._id || r.user || '').toString() === userIdStr
    );
    userRecs
      .filter((r) => r.status === 'DISMISSED')
      .forEach((r) => {
        dismissedTopics.add((r.title || '').toLowerCase());
        if (r.associatedSkill) dismissedTopics.add(r.associatedSkill.toLowerCase());
      });
    existingRecommendations = userRecs.filter(
      (r) => r.status === 'PENDING' || r.status === 'ACCEPTED'
    );
  } else {
    const recs = await CoachRecommendation.find({ user: userIdStr })
      .sort({ createdAt: -1 })
      .lean();
    
    recs
      .filter((r) => r.status === 'DISMISSED')
      .forEach((r) => {
        dismissedTopics.add((r.title || '').toLowerCase());
        if (r.associatedSkill) dismissedTopics.add(r.associatedSkill.toLowerCase());
      });
    existingRecommendations = recs.filter(
      (r) => r.status === 'PENDING' || r.status === 'ACCEPTED'
    );
  }

  // If active recommendations already exist and no refresh requested, return them
  if (existingRecommendations.length > 0 && !forceRefresh) {
    return {
      recommendations: existingRecommendations,
      source: existingRecommendations[0].isAiGenerated ? 'AI_ADAPTIVE' : 'DETERMINISTIC_RULES',
      meta: {
        activeCount: existingRecommendations.length,
        hasGoals: Boolean(user?.learningInterests?.length),
      },
    };
  }

  // 2. Fetch context: goals, roadmaps, circles
  const [goals, roadmaps, circles] = await Promise.all([
    getUserGoals(userIdStr),
    getUserRoadmaps(userIdStr),
    getAvailableCircles(),
  ]);

  // 3. Try Gemini AI generation first, fallback to deterministic rules
  let freshList = await generateGeminiRecommendations(user, goals, roadmaps, circles, dismissedTopics);
  let source = 'AI_ADAPTIVE';

  if (!freshList || freshList.length === 0) {
    freshList = generateDeterministicRecommendations(user, goals, roadmaps, circles, dismissedTopics);
    source = 'DETERMINISTIC_RULES';
  }

  // 4. Persist newly generated recommendations
  const createdRecords = [];
  for (const item of freshList) {
    const recPayload = {
      _id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user: userIdStr,
      type: item.type,
      title: item.title,
      content: item.content,
      rationale: item.rationale,
      associatedSkill: item.associatedSkill || '',
      associatedGoal: item.associatedGoal || null,
      associatedMilestoneId: item.associatedMilestoneId || '',
      status: 'PENDING',
      isAiGenerated: Boolean(item.isAiGenerated),
      actionMetadata: item.actionMetadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (process.env.MOCK_DB === 'true' && CoachRecommendation.db?.readyState !== 1) {
      mockCoachRecommendationsStore.push(recPayload);
      createdRecords.push(recPayload);
    } else {
      const doc = await CoachRecommendation.create({
        user: userIdStr,
        type: item.type,
        title: item.title,
        content: item.content,
        rationale: item.rationale,
        associatedSkill: item.associatedSkill || '',
        associatedGoal: item.associatedGoal || null,
        associatedMilestoneId: item.associatedMilestoneId || '',
        status: 'PENDING',
        isAiGenerated: Boolean(item.isAiGenerated),
        actionMetadata: item.actionMetadata || {},
      });
      createdRecords.push(doc);
    }
  }

  return {
    recommendations: createdRecords,
    source,
    meta: {
      activeCount: createdRecords.length,
      hasGoals: goals.length > 0,
      goalsEvaluated: goals.length,
      roadmapsEvaluated: roadmaps.length,
    },
  };
};

/**
 * Update recommendation status: ACCEPTED, DISMISSED, COMPLETED
 */
export const updateRecommendationStatus = async (userId, recommendationId, updateData = {}) => {
  const userIdStr = (userId?._id || userId || '').toString();
  const { status, userFeedback, dismissalReason } = updateData;

  const validStatuses = new Set(['PENDING', 'ACCEPTED', 'DISMISSED', 'COMPLETED']);
  if (!validStatuses.has(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${Array.from(validStatuses).join(', ')}`);
  }

  if (process.env.MOCK_DB === 'true' && CoachRecommendation.db?.readyState !== 1) {
    const rec = mockCoachRecommendationsStore.find((r) => r._id === recommendationId);
    if (!rec) {
      throw new ApiError(404, 'Recommendation not found');
    }
    if ((rec.user?._id || rec.user || '').toString() !== userIdStr) {
      throw new ApiError(403, 'Forbidden: You do not own this recommendation');
    }

    rec.status = status;
    if (userFeedback !== undefined) rec.userFeedback = sanitizeInput(userFeedback, 500);
    if (dismissalReason !== undefined) rec.dismissalReason = sanitizeInput(dismissalReason, 200);
    rec.updatedAt = new Date();
    return rec;
  }

  const rec = await CoachRecommendation.findById(recommendationId);
  if (!rec) {
    throw new ApiError(404, 'Recommendation not found');
  }

  if (rec.user.toString() !== userIdStr) {
    throw new ApiError(403, 'Forbidden: You do not own this recommendation');
  }

  rec.status = status;
  if (userFeedback !== undefined) rec.userFeedback = sanitizeInput(userFeedback, 500);
  if (dismissalReason !== undefined) rec.dismissalReason = sanitizeInput(dismissalReason, 200);
  await rec.save();

  return rec;
};

/**
 * Ask Coach an interactive question with safe fallback
 */
export const askCoach = async (userId, query, context = {}) => {
  const userIdStr = (userId?._id || userId || '').toString();
  const sanitizedQuery = sanitizeInput(query, 1000);

  if (!sanitizedQuery || sanitizedQuery.length < 3) {
    throw new ApiError(400, 'Please provide a question or topic for the coach (at least 3 characters)');
  }

  const user = await getUserData(userIdStr);
  const userSkillNames = (user?.skills || []).map((s) => s.name).join(', ') || 'General Web Development';

  // Check if Gemini is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim() && process.env.MOCK_DB !== 'true') {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are the EnhanceUs AI Learning Coach. 
Learner has experience in: ${userSkillNames}.
Learner asks: "${sanitizedQuery}"

Respond as a focused learning mentor:
1. Provide 2-3 specific, actionable steps.
2. Clearly distinguish recommendations from verified facts.
3. Suggest an exercise or checkpoint to test understanding.
4. Keep the total response under 200 words.`;

      let adviceText = '';
      if (ai.models?.generateContent) {
        const res = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
        });
        adviceText = res?.text || '';
      }

      if (adviceText.trim()) {
        return {
          response: adviceText.trim(),
          source: 'AI_ADAPTIVE',
          suggestedNextSteps: [
            'Break this topic into a 30-minute practice exercise',
            'Add this topic to your target learning interests',
            'Find a peer exchange partner to practice with',
          ],
        };
      }
    } catch (err) {
      console.warn('[Coach Chat Warning] Gemini failed, falling back to deterministic response:', err.message);
    }
  }

  // Deterministic Keyword-based Advisory Fallback
  const lowerQ = sanitizedQuery.toLowerCase();
  let advice = '';

  if (lowerQ.includes('exercise') || lowerQ.includes('project') || lowerQ.includes('practice')) {
    advice = `To practice effectively, build a focused proof-of-skill sample:
1. Define the minimal functional scope (e.g., a single component or CLI tool).
2. Implement edge case handling and write 2-3 unit tests.
3. Upload the project to your GitHub or portfolio to verify your milestone with real evidence.`;
  } else if (lowerQ.includes('prerequisite') || lowerQ.includes('begin') || lowerQ.includes('start')) {
    advice = `Before advancing, verify these foundational steps:
1. Ensure you have hands-on comfort with syntax and basic data structures in ${userSkillNames}.
2. Review the milestone prerequisites in your active roadmap.
3. Schedule a 30-minute peer exchange session with an experienced mentor.`;
  } else if (lowerQ.includes('circle') || lowerQ.includes('partner') || lowerQ.includes('exchange')) {
    advice = `For collaborative learning progress:
1. Check our active Community Circles to join a cohort with weekly syncs.
2. Use the Intelligent Match page to find peers with complementary teaching and learning skills.
3. Prepare 2-3 specific questions prior to meeting your partner.`;
  } else {
    advice = `Here is our coach guidance for "${sanitizedQuery}":
1. Break down the concept into sub-skills and tackle them sequentially.
2. Apply hands-on practice immediately after reading conceptual documentation.
3. Document your progress in a portfolio project to demonstrate verified proficiency.`;
  }

  return {
    response: advice,
    source: 'DETERMINISTIC_RULES',
    suggestedNextSteps: [
      'Save this guidance as a personal note',
      'Create a roadmap milestone for this topic',
      'Explore matching peers for this skill',
    ],
  };
};

export default {
  getPersonalizedRecommendations,
  updateRecommendationStatus,
  askCoach,
  generateDeterministicRecommendations,
};
