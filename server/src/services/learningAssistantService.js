import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import { Roadmap } from '../models/roadmapModel.js';
import { mockRoadmapsStore } from './roadmapService.js';
import { AssistantConversation } from '../models/assistantConversationModel.js';
import curatedResourceService from './curatedResourceService.js';
import { ApiError } from '../utils/apiError.js';

// In-memory conversation store for MOCK_DB === 'true'
const mockConversationsStore = new Map();

/**
 * Sanitize text to remove control characters and HTML tags
 */
const sanitizeText = (str, maxLength = 2000) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Strip control chars
    .trim()
    .slice(0, maxLength);
};

export class LearningAssistantService {
  constructor() {
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  /**
   * Build minimal, authorized context from authenticated user's roadmap and milestone
   */
  async buildLearningContext(userId, roadmapId, milestoneId = null) {
    if (!roadmapId) {
      throw new ApiError(400, 'Roadmap identifier is required to provide contextual learning assistance');
    }

    let roadmap = null;

    if (process.env.MOCK_DB === 'true') {
      roadmap = mockRoadmapsStore.find(
        (r) => r._id === roadmapId && r.user === userId.toString()
      );
    } else {
      if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
        throw new ApiError(400, 'Invalid roadmap identifier format');
      }
      roadmap = await Roadmap.findOne({ _id: roadmapId, user: userId }).populate(
        'goal',
        'title description status'
      );
    }

    if (!roadmap) {
      throw new ApiError(404, 'Roadmap not found or access denied');
    }

    // Identify target milestone (if specified) or next recommended milestone
    let activeMilestone = null;
    if (milestoneId) {
      activeMilestone = (roadmap.milestones || []).find((m) => m.milestoneId === milestoneId);
      if (!activeMilestone) {
        throw new ApiError(404, `Milestone "${milestoneId}" not found within this roadmap`);
      }
    } else if (roadmap.progress?.nextRecommendedMilestoneId) {
      activeMilestone = (roadmap.milestones || []).find(
        (m) => m.milestoneId === roadmap.progress.nextRecommendedMilestoneId
      );
    }

    const targetSkill = activeMilestone?.skillName || (roadmap.skills && roadmap.skills[0]?.name) || 'General Development';

    // Retrieve curated resources connected to this skill
    let relevantResources = [];
    try {
      relevantResources = await curatedResourceService.getResourcesForSkill(targetSkill, {}, userId);
    } catch (err) {
      console.warn('[AssistantService] Could not fetch curated resources:', err.message);
    }

    return {
      roadmapId: roadmap._id,
      roadmapTitle: roadmap.title,
      goalTitle: roadmap.goal?.title || roadmap.title,
      goalDescription: roadmap.goal?.description || roadmap.goalSummary,
      activeMilestone: activeMilestone
        ? {
            milestoneId: activeMilestone.milestoneId,
            title: activeMilestone.title,
            description: activeMilestone.description,
            skillName: activeMilestone.skillName,
            stageNumber: activeMilestone.stageNumber,
            completionCriteria: activeMilestone.completionCriteria,
            status: activeMilestone.status,
            learnerNotes: activeMilestone.learnerNotes || '',
            blockedReason: activeMilestone.blockedReason || '',
            requiredPrerequisites: activeMilestone.requiredPrerequisites || [],
          }
        : null,
      progress: {
        completionPercentage: roadmap.progress?.completionPercentage || 0,
        completedCount: roadmap.progress?.completedCount || 0,
        remainingCount: roadmap.progress?.remainingCount || 0,
        nextRecommendedMilestone: roadmap.progress?.nextRecommendedMilestone?.title || null,
      },
      relevantResources: relevantResources.slice(0, 3).map((r) => ({
        title: r.title,
        url: r.url,
        source: r.source,
        type: r.type,
        isVerified: r.isVerified,
      })),
    };
  }

  /**
   * Process an action query through Gemini AI or deterministic fallback
   */
  async processQuery({ userId, roadmapId, milestoneId = null, actionType = 'GENERAL_QUERY', query = '' }) {
    const context = await this.buildLearningContext(userId, roadmapId, milestoneId);
    const sanitizedQuery = sanitizeText(query, 1000);

    const action = (actionType || 'GENERAL_QUERY').toUpperCase();
    const validActions = new Set([
      'EXPLAIN_CONCEPT',
      'HELP_BLOCKER',
      'GUIDE_MILESTONE',
      'PRACTICE_EXERCISE',
      'KNOWLEDGE_CHECK',
      'EVALUATE_ANSWER',
      'SUMMARIZE_PROGRESS',
      'PEER_PREP',
      'GENERAL_QUERY',
    ]);

    const resolvedAction = validActions.has(action) ? action : 'GENERAL_QUERY';

    let assistantResponse = null;
    let structuredData = null;

    // Check if Gemini is configured
    const currentApiKey = process.env.GEMINI_API_KEY;
    if (currentApiKey && currentApiKey.trim()) {
      try {
        const aiResult = await this.invokeGeminiAssistant(context, resolvedAction, sanitizedQuery);
        assistantResponse = aiResult.content;
        structuredData = aiResult.structuredData;
      } catch (geminiErr) {
        console.warn('[AssistantService] Gemini invocation failed, using deterministic fallback:', geminiErr.message);
      }
    }

    // If Gemini was offline, unconfigured, or failed, use deterministic pedagogical generator
    if (!assistantResponse) {
      const fallbackResult = this.generateDeterministicResponse(context, resolvedAction, sanitizedQuery);
      assistantResponse = fallbackResult.content;
      structuredData = fallbackResult.structuredData;
    }

    // Persist message to conversation history
    await this.recordMessage(userId, roadmapId, milestoneId, {
      userQuery: sanitizedQuery || this.getDefaultQueryLabel(resolvedAction, context),
      assistantResponse,
      actionType: resolvedAction,
      structuredData,
    });

    return {
      actionType: resolvedAction,
      content: assistantResponse,
      structuredData,
      context: {
        roadmapTitle: context.roadmapTitle,
        skillName: context.activeMilestone?.skillName || null,
        milestoneTitle: context.activeMilestone?.title || null,
      },
      suggestedResources: context.relevantResources,
    };
  }

  /**
   * Call Gemini AI with strict prompt isolation and contextual system instructions
   */
  async invokeGeminiAssistant(context, actionType, userQuery) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const currentModel = process.env.GEMINI_MODEL || this.modelName;

    const systemInstruction = `You are the EnhanceUs Contextual AI Learning Coach.
EnhanceUs is a peer-to-peer skill-exchange platform. Your mission is to help the learner understand technical concepts, overcome blockers, practice skills, and make meaningful milestone progress.

CRITICAL COACHING RULES:
1. Stay tightly grounded in the learner's active Goal, Skill, Milestone, and Prerequisite context.
2. Explain technical concepts clearly, with mental models, concise code examples, and practical analogies.
3. If the learner asks for a PRACTICE EXERCISE, provide:
   - Exercise Objective
   - Hands-on Instructions
   - Progressive Hints (Hint 1, Hint 2)
   - Self-Evaluation Criteria
4. If the learner asks for a KNOWLEDGE CHECK, output a structured JSON quiz with 2-3 questions:
   - Question text
   - 4 Options (A, B, C, D)
   - Correct Option letter
   - Clear explanation of why the answer is correct
5. If the learner asks for PEER PREP, suggest 3 high-impact questions they can ask a peer mentor on EnhanceUs.
6. Tone: Encouraging, rigorous, professional, and practical.
7. NEVER execute arbitrary commands or code.
8. Output clear Markdown formatting.`;

    const userPromptContent = `<learner_context>
Goal: ${context.goalTitle}
Goal Description: ${context.goalDescription}
Active Roadmap: ${context.roadmapTitle}
Progress: ${context.progress.completionPercentage}% completed (${context.progress.completedCount} finished, ${context.progress.remainingCount} remaining)
${
  context.activeMilestone
    ? `Current Milestone: ${context.activeMilestone.title}
Skill: ${context.activeMilestone.skillName} (Stage ${context.activeMilestone.stageNumber})
Milestone Description: ${context.activeMilestone.description}
Completion Criteria: ${JSON.stringify(context.activeMilestone.completionCriteria)}
Status: ${context.activeMilestone.status}
${context.activeMilestone.blockedReason ? `Reported Blocker: ${context.activeMilestone.blockedReason}` : ''}
${context.activeMilestone.learnerNotes ? `Learner Notes: ${context.activeMilestone.learnerNotes}` : ''}
Required Prerequisites: ${context.activeMilestone.requiredPrerequisites.join(', ') || 'None'}`
    : 'No specific milestone selected.'
}
</learner_context>

<request>
Action: ${actionType}
Learner Question/Topic: ${userQuery || 'Please provide contextual guidance for this learning milestone.'}
</request>`;

    const candidateModels = ['gemini-3.8-flash', currentModel, 'gemini-2.5-flash', 'gemini-1.5-flash'].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI assistant response timed out after 20s')), 20000);
    });

    let rawText = null;
    for (const m of candidateModels) {
      try {
        const res = await Promise.race([
          ai.models.generateContent({
            model: m,
            contents: userPromptContent,
            config: {
              systemInstruction,
              temperature: 0.3,
              maxOutputTokens: 2048,
            },
          }),
          timeoutPromise,
        ]);
        if (res?.text) {
          rawText = res.text;
          break;
        }
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('not found') || msg.includes('no longer available')) {
          continue;
        }
        throw err;
      }
    }

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    let structuredData = null;

    // Check if the output contains a JSON quiz structure for KNOWLEDGE_CHECK
    if (actionType === 'KNOWLEDGE_CHECK' && rawText.includes('{') && rawText.includes('questions')) {
      try {
        const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          if (Array.isArray(parsed.questions)) {
            structuredData = { questions: parsed.questions };
          }
        }
      } catch {
        // Fallback to text presentation
      }
    }

    return {
      content: rawText,
      structuredData,
    };
  }

  /**
   * Deterministic pedagogical response generator (works 100% offline without Gemini)
   */
  generateDeterministicResponse(context, actionType, userQuery) {
    const ms = context.activeMilestone;
    const skillName = ms?.skillName || context.roadmapTitle;
    const milestoneTitle = ms?.title || 'Foundational Competency';
    const criteria = ms?.completionCriteria && ms.completionCriteria.length > 0
      ? ms.completionCriteria.join('; ')
      : 'Build and test a runnable practical implementation.';

    switch (actionType) {
      case 'EXPLAIN_CONCEPT':
        return {
          content: `### 💡 Core Concept: ${skillName}\n\nTo master **${milestoneTitle}**, you need a solid mental model of **${skillName}**.\n\n#### Key Fundamentals:\n- **Purpose**: ${ms?.description || `Develop robust capability in ${skillName}`}.\n- **Architecture**: In modern engineering, ${skillName} enables modular, scalable solutions that separate business logic from infrastructure.\n- **Prerequisites**: Make sure you are comfortable with foundational syntax before tackling complex asynchronous or distributed patterns.\n\n#### Practical Advice:\nFocus on delivering: *${criteria}* in an isolated sandbox before integrating it into your full-stack project.`,
          structuredData: null,
        };

      case 'HELP_BLOCKER':
        const blockerText = ms?.blockedReason || userQuery || 'Concept complexity or debugging obstacle';
        return {
          content: `### 🛠️ Blocker Resolution Guide\n\n**Reported Obstacle:** *${blockerText}*\n\nHere is a 3-step action plan to break through this obstacle:\n\n1. **Isolate the Problem**: Create a minimal reproducible sandbox with only 1 file or component to isolate the failing behavior.\n2. **Inspect Documentation**: Review the verified resources linked below for canonical syntax patterns and common pitfall warnings.\n3. **Peer Exchange**: Schedule a peer session with an EnhanceUs mentor who specializes in **${skillName}** to walk through your code live.`,
          structuredData: null,
        };

      case 'GUIDE_MILESTONE':
        return {
          content: `### 🎯 Milestone Action Guide: ${milestoneTitle}\n\nTo complete this milestone successfully and mark it finished, follow this checklist:\n\n- [ ] **Step 1 — Understand Requirements**: Review the completion criteria (*${criteria}*).\n- [ ] **Step 2 — Scaffold Implementation**: Build the core module with defensive error handling.\n- [ ] **Step 3 — Run Validation Tests**: Test edge cases (null inputs, boundary conditions, timeout recovery).\n- [ ] **Step 4 — Record Learner Notes**: Document what you built in your milestone notes and click **Mark as Completed** to update your roadmap progress!`,
          structuredData: null,
        };

      case 'PRACTICE_EXERCISE':
        const exerciseData = {
          title: `${skillName} Sandbox Drill: ${milestoneTitle}`,
          objective: `Implement and verify: ${criteria}`,
          instructions: [
            `Initialize a local workspace or code sandbox for ${skillName}.`,
            `Scaffold a clean module addressing: "${milestoneTitle}".`,
            `Write unit tests or assertions validating normal and error states.`,
            `Refactor for readability, modularity, and clean comments.`,
          ],
          hints: [
            `Hint 1: Break the task into two sub-problems: first verify data structures, then handle asynchronous flows.`,
            `Hint 2: Review official documentation examples for canonical patterns rather than inventing workarounds.`,
          ],
          evaluationCriteria: [
            'Working runnable prototype with zero unhandled exceptions',
            'Code adheres to clean architecture principles',
            'Demonstrates complete fulfillment of milestone objective',
          ],
        };

        return {
          content: `### 🏋️ Hands-on Practice Exercise\n\n**${exerciseData.title}**\n\n**Objective:** ${exerciseData.objective}\n\n#### Instructions:\n${exerciseData.instructions.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}\n\n#### Progressive Hints:\n- **Hint 1:** ${exerciseData.hints[0]}\n- **Hint 2:** ${exerciseData.hints[1]}\n\n#### Completion Criteria:\n${exerciseData.evaluationCriteria.map((c) => `- ${c}`).join('\n')}`,
          structuredData: exerciseData,
        };

      case 'KNOWLEDGE_CHECK':
        const quizData = {
          questions: [
            {
              id: 'q1',
              question: `In modern development with ${skillName}, what is the primary architectural best practice when working on ${milestoneTitle}?`,
              options: [
                { key: 'A', text: 'Coupling all state and presentation into a single global file' },
                { key: 'B', text: 'Separating concerns with modular functions and defensive error boundaries' },
                { key: 'C', text: 'Bypassing asynchronous error handling to increase throughput' },
                { key: 'D', text: 'Hardcoding environment configurations directly into component code' },
              ],
              correctAnswer: 'B',
              explanation: 'Separation of concerns and defensive error boundaries ensure predictable, maintainable, and testable code.',
            },
            {
              id: 'q2',
              question: `What is the most effective approach to verify that you have fulfilled the completion criteria for this milestone?`,
              options: [
                { key: 'A', text: 'Skimming the tutorial without writing code' },
                { key: 'B', text: 'Writing automated test cases and testing edge cases in a runnable prototype' },
                { key: 'C', text: 'Waiting for peer review before running the code locally' },
                { key: 'D', text: 'Skipping prerequisite concepts to speed up progress' },
              ],
              correctAnswer: 'B',
              explanation: 'Writing tests and verifying edge cases in working code is the gold standard of practical technical mastery.',
            },
          ],
        };

        return {
          content: `### 🧠 Quick Knowledge Check\n\nTest your understanding of **${skillName}** with these 2 questions:\n\n**Question 1:** ${quizData.questions[0].question}\n- A) ${quizData.questions[0].options[0].text}\n- B) ${quizData.questions[0].options[1].text}\n- C) ${quizData.questions[0].options[2].text}\n- D) ${quizData.questions[0].options[3].text}\n\n*Submit your answer below to receive immediate pedagogical feedback!*`,
          structuredData: quizData,
        };

      case 'EVALUATE_ANSWER':
        return {
          content: `### 📝 Answer Feedback\n\nGreat job testing your understanding! Regular retrieval practice reinforces memory and clarifies complex programming abstractions. Check the detailed feedback above for each response.`,
          structuredData: null,
        };

      case 'SUMMARIZE_PROGRESS':
        return {
          content: `### 📊 Roadmap Progress Summary\n\n- **Roadmap:** ${context.roadmapTitle}\n- **Goal:** ${context.goalTitle}\n- **Overall Completion:** ${context.progress.completionPercentage}%\n- **Finished Milestones:** ${context.progress.completedCount}\n- **Remaining Milestones:** ${context.progress.remainingCount}\n- **Next Immediate Action:** ${context.progress.nextRecommendedMilestone || 'All milestones finished!'}\n\nKeep up the steady deliberate practice! Each completed milestone unblocks downstream skills automatically.`,
          structuredData: null,
        };

      case 'PEER_PREP':
        return {
          content: `### 👥 Peer Exchange Session Prep: ${skillName}\n\nWhen meeting with an EnhanceUs peer or mentor to practice **${skillName}**, ask these 3 targeted questions:\n\n1. *"In production projects, what is the most common architectural mistake developers make with ${skillName}?"*\n2. *"How do you approach testing and error recovery for ${milestoneTitle} in your team?"*\n3. *"Could you review my sandbox implementation and suggest two areas for clean-code optimization?"*`,
          structuredData: null,
        };

      case 'GENERAL_QUERY':
      default:
        return {
          content: `### 📘 Contextual Learning Coach\n\nYou are currently working on **${milestoneTitle}** (${skillName}) toward your goal **${context.goalTitle}**.\n\n${userQuery ? `Regarding your question: "${userQuery}"\n\n` : ''}Focus on applying the core concepts in your sandbox exercises. Check the curated official documentation resources linked below, or select one of the quick actions above (Explain Concept, Practice Exercise, or Knowledge Check) to dive deeper!`,
          structuredData: null,
        };
    }
  }

  getDefaultQueryLabel(actionType, context) {
    switch (actionType) {
      case 'EXPLAIN_CONCEPT':
        return `Explain concept: ${context.activeMilestone?.skillName || context.roadmapTitle}`;
      case 'HELP_BLOCKER':
        return `Help with blocker on milestone`;
      case 'GUIDE_MILESTONE':
        return `Guide milestone completion`;
      case 'PRACTICE_EXERCISE':
        return `Request practice exercise`;
      case 'KNOWLEDGE_CHECK':
        return `Request knowledge check quiz`;
      case 'SUMMARIZE_PROGRESS':
        return `Summarize my learning progress`;
      case 'PEER_PREP':
        return `Prepare for peer exchange session`;
      default:
        return 'Learning guidance request';
    }
  }

  /**
   * Record message into user conversation history
   */
  async recordMessage(userId, roadmapId, milestoneId, { userQuery, assistantResponse, actionType, structuredData }) {
    if (process.env.MOCK_DB === 'true') {
      const key = `${userId.toString()}::${roadmapId.toString()}`;
      if (!mockConversationsStore.has(key)) {
        mockConversationsStore.set(key, {
          user: userId.toString(),
          roadmap: roadmapId.toString(),
          milestoneId,
          messages: [],
        });
      }

      const conv = mockConversationsStore.get(key);
      conv.milestoneId = milestoneId || conv.milestoneId;
      conv.messages.push(
        {
          _id: `msg_u_${Date.now()}`,
          role: 'user',
          content: userQuery,
          actionType,
          structuredData: null,
          timestamp: new Date().toISOString(),
        },
        {
          _id: `msg_a_${Date.now() + 1}`,
          role: 'assistant',
          content: assistantResponse,
          actionType,
          structuredData,
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    try {
      const userObjId = new mongoose.Types.ObjectId(userId);
      const roadmapObjId = new mongoose.Types.ObjectId(roadmapId);

      await AssistantConversation.findOneAndUpdate(
        { user: userObjId, roadmap: roadmapObjId },
        {
          $set: { milestoneId },
          $push: {
            messages: {
              $each: [
                {
                  role: 'user',
                  content: userQuery,
                  actionType,
                  structuredData: null,
                  timestamp: new Date(),
                },
                {
                  role: 'assistant',
                  content: assistantResponse,
                  actionType,
                  structuredData,
                  timestamp: new Date(),
                },
              ],
            },
          },
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('[AssistantService] Could not persist conversation message:', err.message);
    }
  }

  /**
   * Retrieve conversation history for a roadmap
   */
  async getConversation(userId, roadmapId) {
    if (!roadmapId) {
      throw new ApiError(400, 'Roadmap identifier required');
    }

    if (process.env.MOCK_DB === 'true') {
      const roadmap = mockRoadmapsStore.find(
        (r) => (r._id === roadmapId || r.id === roadmapId) && r.user?.toString() === userId.toString()
      );
      if (!roadmap) {
        throw new ApiError(404, 'Roadmap not found or access unauthorized');
      }
      const key = `${userId.toString()}::${roadmapId.toString()}`;
      return mockConversationsStore.get(key) || { messages: [] };
    }

    if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
      throw new ApiError(400, 'Invalid roadmap identifier format');
    }

    // Verify ownership of the roadmap
    const roadmap = await Roadmap.findOne({
      _id: roadmapId,
      user: userId,
    });
    if (!roadmap) {
      throw new ApiError(404, 'Roadmap not found or access unauthorized');
    }

    const conv = await AssistantConversation.findOne({
      user: userId,
      roadmap: roadmapId,
    });

    return conv || { messages: [] };
  }

  /**
   * Clear conversation history for a roadmap
   */
  async clearConversation(userId, roadmapId) {
    if (!roadmapId) {
      throw new ApiError(400, 'Roadmap identifier required');
    }

    if (process.env.MOCK_DB === 'true') {
      const roadmap = mockRoadmapsStore.find(
        (r) => (r._id === roadmapId || r.id === roadmapId) && r.user?.toString() === userId.toString()
      );
      if (!roadmap) {
        throw new ApiError(404, 'Roadmap not found or access unauthorized');
      }
      const key = `${userId.toString()}::${roadmapId.toString()}`;
      mockConversationsStore.delete(key);
      return { success: true, message: 'Conversation history cleared successfully' };
    }

    if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
      throw new ApiError(400, 'Invalid roadmap identifier format');
    }

    // Verify ownership of the roadmap
    const roadmap = await Roadmap.findOne({
      _id: roadmapId,
      user: userId,
    });
    if (!roadmap) {
      throw new ApiError(404, 'Roadmap not found or access unauthorized');
    }

    await AssistantConversation.findOneAndDelete({
      user: userId,
      roadmap: roadmapId,
    });

    return { success: true, message: 'Conversation history cleared successfully' };
  }
}

export const learningAssistantService = new LearningAssistantService();
export default learningAssistantService;
