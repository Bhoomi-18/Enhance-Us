import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Match from '../models/matchModel.js';
import Connection from '../models/connectionModel.js';
import { ApiError } from '../utils/apiError.js';
import {
  normalizeSkillName,
  areSkillsCompatible,
  calculateProficiencyCompatibility,
} from '../utils/skillNormalizer.js';

/**
 * Intelligent Explainable Scoring Weights (Total: 100)
 */
export const MATCH_WEIGHTS = {
  RECIPROCAL_FIT: 40,      // Bilateral teaching-learning reciprocity
  SKILL_NEED_COVERAGE: 30, // How well candidate addresses user's learning gaps / interests
  AVAILABILITY: 15,        // Schedule compatibility
  PROFICIENCY: 10,         // Appropriate teaching/experience level
  RELIABILITY: 5,          // Community reputation & completion history (newcomer safe)
};

/**
 * Evaluates match compatibility between a user and candidate peer.
 * Works both with a specific goal and directly with profile skills & interests.
 */
export const calculateMatchScore = (user, candidate, goal = null) => {
  const explanation = [];
  const matchedSkills = [];
  const reciprocalSkills = [];

  let reciprocityScore = 0;
  let needScore = 0;
  let availabilityScore = 0;
  let proficiencyScore = 0;
  let reliabilityScore = 0;

  // 1. Determine user's learning needs (Goal gaps prioritized, falling back to profile learningInterests)
  let userNeeds = [];
  if (goal) {
    const gaps = goal.skillGaps?.missingSkills || [];
    if (gaps.length > 0) {
      userNeeds = gaps.map((g) => ({
        name: normalizeSkillName(g.name),
        rawName: g.name,
        targetLevel: g.requiredLevel || 'INTERMEDIATE',
        isGoalGap: true,
      }));
    } else if (goal.requiredSkills && goal.requiredSkills.length > 0) {
      userNeeds = goal.requiredSkills.map((r) => ({
        name: normalizeSkillName(r.name),
        rawName: r.name,
        targetLevel: r.level || 'INTERMEDIATE',
        isGoalGap: false,
      }));
    }
  }

  // Fallback or complement with profile learning interests
  if (userNeeds.length === 0 && user.learningInterests && user.learningInterests.length > 0) {
    userNeeds = user.learningInterests.map((interest) => ({
      name: normalizeSkillName(interest.name),
      rawName: interest.name,
      targetLevel: 'INTERMEDIATE',
      isGoalGap: false,
    }));
  }

  // 2. Candidate's teaching skills
  const candidateTeachSkills = (candidate.skills || [])
    .filter((s) => !s.type || s.type === 'TEACH' || s.type === 'both')
    .map((s) => ({
      name: normalizeSkillName(s.name),
      rawName: s.name,
      level: s.level || 'INTERMEDIATE',
      category: s.category || 'General',
    }));

  // 3. User's teaching skills
  const userTeachSkills = (user.skills || [])
    .filter((s) => !s.type || s.type === 'TEACH' || s.type === 'both')
    .map((s) => ({
      name: normalizeSkillName(s.name),
      rawName: s.name,
      level: s.level || 'INTERMEDIATE',
      category: s.category || 'General',
    }));

  // 4. Candidate's learning interests
  const candidateLearnInterests = (candidate.learningInterests || []).map((i) => ({
    name: normalizeSkillName(i.name),
    rawName: i.name,
    priority: i.priority || 'HIGH',
  }));

  // ==========================================
  // A. SKILL NEED COVERAGE (What candidate teaches that user needs)
  // ==========================================
  userNeeds.forEach((need) => {
    const matchedCandidateSkill = candidateTeachSkills.find((cs) =>
      areSkillsCompatible(cs.name, need.name)
    );
    if (matchedCandidateSkill) {
      matchedSkills.push({
        needSkill: need.name,
        candidateTeachSkill: matchedCandidateSkill.name,
        level: matchedCandidateSkill.level,
      });
    }
  });

  if (matchedSkills.length > 0) {
    const coverageRatio = Math.min(1, matchedSkills.length / Math.max(1, userNeeds.length));
    needScore = Math.round(coverageRatio * 100);
    const skillList = matchedSkills.map((m) => m.candidateTeachSkill).join(', ');
    if (goal) {
      explanation.push(`✓ They teach ${skillList}, directly resolving your goal blueprint requirements`);
    } else {
      explanation.push(`✓ They teach ${skillList}, which aligns with your learning interests`);
    }
  }

  // ==========================================
  // B. RECIPROCITY FIT (What user teaches that candidate wants)
  // ==========================================
  candidateLearnInterests.forEach((interest) => {
    const matchedUserSkill = userTeachSkills.find((us) =>
      areSkillsCompatible(us.name, interest.name)
    );
    if (matchedUserSkill) {
      reciprocalSkills.push({
        candidateLearnSkill: interest.name,
        userTeachSkill: matchedUserSkill.name,
        level: matchedUserSkill.level,
      });
    }
  });

  if (reciprocalSkills.length > 0) {
    reciprocityScore = 100;
    const recipList = reciprocalSkills.map((r) => r.userTeachSkill).join(', ');
    explanation.push(`✓ You teach ${recipList}, fulfilling their stated learning goals`);
  } else {
    reciprocityScore = 0;
  }

  // Determine Match Type
  const isReciprocal = matchedSkills.length > 0 && reciprocalSkills.length > 0;
  const matchType = isReciprocal ? 'RECIPROCAL_EXCHANGE' : 'PARTIAL_MATCH';

  if (isReciprocal) {
    explanation.push(`✓ Reciprocal exchange synergy: balanced 2-way knowledge transfer where both peers gain valuable skills`);
  } else {
    if (matchedSkills.length > 0) {
      explanation.push(`ℹ Partial match: Peer can teach you, but reciprocal exchange topic is open for negotiation`);
    } else if (reciprocalSkills.length > 0) {
      explanation.push(`ℹ Partial match: You can mentor this peer, but their skills don't currently match your target goal`);
    }
  }

  // ==========================================
  // C. AVAILABILITY & TIMEZONE COMPATIBILITY
  // ==========================================
  const userAvail = (user.availability || 'flexible').toLowerCase();
  const candAvail = (candidate.availability || 'flexible').toLowerCase();
  const isAvailCompatible =
    userAvail === 'flexible' || candAvail === 'flexible' || userAvail === candAvail;

  if (isAvailCompatible) {
    availabilityScore = 100;
    explanation.push(`✓ Compatible collaboration schedule (${candAvail} availability overlaps)`);
  } else {
    availabilityScore = 40;
  }

  // ==========================================
  // D. PROFICIENCY COMPATIBILITY
  // ==========================================
  let levelCompatAccum = 0;
  let levelCompatCount = 0;

  matchedSkills.forEach((ms) => {
    const correspondingNeed = userNeeds.find((n) => areSkillsCompatible(n.name, ms.needSkill));
    const targetLevel = correspondingNeed?.targetLevel || 'INTERMEDIATE';
    levelCompatAccum += calculateProficiencyCompatibility(ms.level, targetLevel);
    levelCompatCount++;
  });

  if (levelCompatCount > 0) {
    proficiencyScore = Math.round(levelCompatAccum / levelCompatCount);
    explanation.push(`✓ Experienced instructor level for your required learning depth`);
  } else {
    const userExp = (user.experienceLevel || 'INTERMEDIATE').toUpperCase();
    const candExp = (candidate.experienceLevel || 'INTERMEDIATE').toUpperCase();
    proficiencyScore = userExp === candExp ? 85 : 65;
  }

  // ==========================================
  // E. RELIABILITY & REPUTATION (Safe for newcomers)
  // ==========================================
  const candReputation = candidate.reputation || { averageRating: 5.0, reviewCount: 0 };
  const rating = candReputation.averageRating != null ? candReputation.averageRating : 5.0;
  const reviews = candReputation.reviewCount || 0;
  const completed = candidate.sessionsCompleted || 0;

  // Base score from rating (out of 5 -> 0 to 100)
  reliabilityScore = Math.round((Math.min(5, Math.max(1, rating)) / 5) * 100);

  // Newcomers with 0 reviews start with fair baseline (90/100)
  if (reviews === 0 && completed === 0) {
    reliabilityScore = 90;
    explanation.push(`✓ Verified newcomer ready for initial knowledge exchange`);
  } else if (reviews > 0) {
    explanation.push(`✓ Established community trust (${rating.toFixed(1)}★ across ${reviews} peer reviews)`);
  }

  // ==========================================
  // F. WEIGHTED COMPOSITE SCORE CALCULATION
  // ==========================================
  const rawScore =
    (reciprocityScore * MATCH_WEIGHTS.RECIPROCAL_FIT +
      needScore * MATCH_WEIGHTS.SKILL_NEED_COVERAGE +
      availabilityScore * MATCH_WEIGHTS.AVAILABILITY +
      proficiencyScore * MATCH_WEIGHTS.PROFICIENCY +
      reliabilityScore * MATCH_WEIGHTS.RELIABILITY) / 100;

  const overallScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    overallScore,
    matchType,
    explanation,
    matchedSkills,
    reciprocalSkills,
    availabilityCompatibility: isAvailCompatible,
    skillCompatibility: needScore,
    scoreBreakdown: {
      reciprocityScore,
      needScore,
      availabilityScore,
      proficiencyScore,
      reliabilityScore,
    },
  };
};

/**
 * Generates and returns peer recommendations for a user.
 * Supports goal-driven recommendations or profile-level matching.
 */
export const generateMatchesForUser = async (userId, goalId = null) => {
  // Handle Mock DB Mode (offline test fallback only)
  if (process.env.MOCK_DB === 'true' && Match.db?.readyState !== 1) {
    return [
      {
        _id: 'mock_match_1',
        user: userId,
        candidate: {
          _id: 'candidate_user_b',
          name: 'Sarah Chen (UI/UX Specialist)',
          email: 'sarah.chen@example.org',
          bio: 'Product Designer & UI/UX Specialist with 5 years experience creating clean web applications.',
          avatar: '',
          skills: [
            { name: 'UI/UX Design', category: 'Design', level: 'EXPERT', type: 'TEACH' },
            { name: 'Figma Prototyping', category: 'Design', level: 'ADVANCED', type: 'TEACH' },
          ],
          learningInterests: [
            { name: 'React', priority: 'HIGH' },
            { name: 'Node.js', priority: 'MEDIUM' },
          ],
          availability: 'flexible',
          timezone: 'UTC',
          experienceLevel: 'ADVANCED',
          preferredLearningStyle: 'hands_on',
          languages: ['English'],
          reputation: { averageRating: 5.0, reviewCount: 4 },
          sessionsCompleted: 4,
        },
        goal: {
          _id: goalId || 'mock_goal_1',
          title: 'Build an AI-powered SaaS Application',
        },
        matchType: 'RECIPROCAL_EXCHANGE',
        matchedSkills: [
          { needSkill: 'UI/UX Design', candidateTeachSkill: 'UI/UX Design' },
        ],
        reciprocalSkills: [
          { candidateLearnSkill: 'React', userTeachSkill: 'React' },
        ],
        availabilityCompatibility: true,
        skillCompatibility: 90,
        overallScore: 95,
        scoreBreakdown: {
          reciprocityScore: 100,
          needScore: 90,
          availabilityScore: 100,
          proficiencyScore: 100,
          reliabilityScore: 100,
        },
        status: 'SUGGESTED',
        explanation: [
          '✓ They teach UI/UX Design, directly resolving your goal blueprint requirements',
          '✓ You teach React, fulfilling their stated learning goals',
          '✓ Compatible collaboration schedule (flexible availability overlaps)',
          '✓ Experienced instructor level for your required learning depth',
          '✓ Established community trust (5.0★ across 4 peer reviews)',
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Resolve target goal (if provided, or find user's latest active goal)
  let goal = null;
  if (goalId) {
    goal = await Goal.findOne({ _id: goalId, user: userId });
  } else {
    goal = await Goal.findOne({ user: userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
  }

  // If user has neither an active goal nor profile learning interests/skills, provide clear guidance
  const hasProfileSkills = (user.skills && user.skills.length > 0) || (user.learningInterests && user.learningInterests.length > 0);
  if (!goal && !hasProfileSkills) {
    throw new ApiError(
      400,
      'To generate peer matches, please list skills you offer or learning interests in your profile, or define an active goal.'
    );
  }

  // Find existing active connections to exclude already paired peers
  const existingConnections = await Connection.find({
    participants: userId,
    status: 'ACTIVE',
  }).select('participants');

  const connectedPeerIds = new Set();
  existingConnections.forEach((conn) => {
    conn.participants.forEach((p) => {
      if (p.toString() !== userId.toString()) {
        connectedPeerIds.add(p.toString());
      }
    });
  });

  // Query discoverable candidates:
  // - Exclude current user
  // - Exclude suspended accounts
  // - Exclude already active connections
  // - Exclude demo accounts for real users (unless current user is a demo account)
  const candidateQuery = {
    _id: { $ne: userId, $nin: Array.from(connectedPeerIds) },
    isSuspended: { $ne: true },
  };

  if (!user.isDemo) {
    candidateQuery.isDemo = { $ne: true };
  } else {
    // Strict isolation: Demo accounts match only with demo peers, preventing real-user exposure
    candidateQuery.isDemo = true;
  }

  const candidates = await User.find(candidateQuery).select('-password');

  const generatedMatches = [];

  for (const candidate of candidates) {
    const analysis = calculateMatchScore(user, candidate, goal);

    // Save recommendations with reasonable compatibility threshold (>= 25)
    if (analysis.overallScore >= 25) {
      const matchData = {
        user: userId,
        candidate: candidate._id,
        goal: goal?._id || null,
        matchType: analysis.matchType,
        matchedSkills: analysis.matchedSkills,
        reciprocalSkills: analysis.reciprocalSkills,
        availabilityCompatibility: analysis.availabilityCompatibility,
        skillCompatibility: analysis.skillCompatibility,
        overallScore: analysis.overallScore,
        scoreBreakdown: analysis.scoreBreakdown,
        explanation: analysis.explanation,
        status: 'SUGGESTED',
      };

      const matchFilter = {
        user: userId,
        candidate: candidate._id,
        goal: goal?._id || null,
      };

      const match = await Match.findOneAndUpdate(
        matchFilter,
        matchData,
        { upsert: true, new: true }
      )
        .populate('candidate', '-password')
        .populate('goal', 'title description');

      generatedMatches.push(match);
    }
  }

  // Return sorted deterministically by overallScore descending, then reciprocity
  return generatedMatches.sort((a, b) => {
    if (b.overallScore !== a.overallScore) {
      return b.overallScore - a.overallScore;
    }
    return (b.scoreBreakdown?.reciprocityScore || 0) - (a.scoreBreakdown?.reciprocityScore || 0);
  });
};

/**
 * Retrieves a single match record ensuring user authorization.
 */
export const getMatchById = async (matchId, userId) => {
  if (process.env.MOCK_DB === 'true' && Match.db?.readyState !== 1) {
    const matches = await generateMatchesForUser(userId);
    return matches[0];
  }

  const match = await Match.findOne({ _id: matchId, user: userId })
    .populate('candidate', '-password')
    .populate('goal');

  if (!match) {
    throw new ApiError(404, 'Match not found or access denied');
  }

  return match;
};

export default {
  MATCH_WEIGHTS,
  calculateMatchScore,
  generateMatchesForUser,
  getMatchById,
};
