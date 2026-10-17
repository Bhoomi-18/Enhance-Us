import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Match from '../models/matchModel.js';
import { ApiError } from '../utils/apiError.js';

// Configurable Scoring Weight Constants (Must total 100)
export const MATCH_WEIGHTS = {
  SKILL_NEED_MATCH: 40,
  RECIPROCAL_MATCH: 25,
  AVAILABILITY: 15,
  PROFICIENCY_COMPATIBILITY: 10,
  LEARNING_STYLE: 5,
  LANGUAGE: 5,
};

export const calculateMatchScore = (user, candidate, goal) => {
  const explanation = [];
  const matchedSkills = [];
  const reciprocalSkills = [];

  let skillNeedScore = 0;
  let reciprocalScore = 0;
  let availabilityScore = 0;
  let proficiencyScore = 0;
  let styleScore = 0;
  let languageScore = 0;

  // Extract missing & required skills for the goal
  const missingGaps = goal.skillGaps?.missingSkills || [];
  const requiredSkills = goal.requiredSkills || [];

  const candidateTeachSkills = (candidate.skills || []).filter(
    (s) => !s.type || s.type === 'TEACH' || s.type === 'both'
  );

  const candidateLearnSkills = candidate.learningInterests || [];
  const userTeachSkills = (user.skills || []).filter(
    (s) => !s.type || s.type === 'TEACH' || s.type === 'both'
  );

  // 1. Skill Need Match (40% Weight)
  missingGaps.forEach((gap) => {
    const matchedCandidateSkill = candidateTeachSkills.find(
      (cs) => cs.name && cs.name.toLowerCase().includes(gap.name.toLowerCase()) || gap.name.toLowerCase().includes(cs.name.toLowerCase())
    );
    if (matchedCandidateSkill) {
      matchedSkills.push({
        needSkill: gap.name,
        candidateTeachSkill: matchedCandidateSkill.name,
      });
    }
  });

  if (matchedSkills.length > 0) {
    skillNeedScore = Math.min(100, (matchedSkills.length / Math.max(1, missingGaps.length)) * 100);
    explanation.push(
      `✓ They teach ${matchedSkills.map((m) => m.candidateTeachSkill).join(', ')}, which you need for your goal`
    );
  } else {
    // Check general required skills
    requiredSkills.forEach((req) => {
      const matched = candidateTeachSkills.find((cs) => cs.name && cs.name.toLowerCase().includes(req.name.toLowerCase()));
      if (matched) {
        matchedSkills.push({ needSkill: req.name, candidateTeachSkill: matched.name });
      }
    });
    if (matchedSkills.length > 0) {
      skillNeedScore = 70;
      explanation.push(`✓ They offer ${matchedSkills.map((m) => m.candidateTeachSkill).join(', ')} related to your goal`);
    }
  }

  // 2. Reciprocal Match (25% Weight)
  candidateLearnSkills.forEach((interest) => {
    const userOffer = userTeachSkills.find(
      (us) => us.name && us.name.toLowerCase().includes(interest.name.toLowerCase()) || interest.name.toLowerCase().includes(us.name.toLowerCase())
    );
    if (userOffer) {
      reciprocalSkills.push({
        candidateLearnSkill: interest.name,
        userTeachSkill: userOffer.name,
      });
    }
  });

  if (reciprocalSkills.length > 0) {
    reciprocalScore = 100;
    explanation.push(
      `✓ You teach ${reciprocalSkills.map((r) => r.userTeachSkill).join(', ')}, which they want to learn`
    );
  }

  // 3. Availability Compatibility (15% Weight)
  const userAvail = user.availability || 'flexible';
  const candAvail = candidate.availability || 'flexible';
  const availabilityMatch = userAvail === 'flexible' || candAvail === 'flexible' || userAvail === candAvail;

  if (availabilityMatch) {
    availabilityScore = 100;
    explanation.push(`✓ Schedule alignment (${candAvail} availability overlaps)`);
  }

  // 4. Proficiency Compatibility (10% Weight)
  const userExp = (user.experienceLevel || 'INTERMEDIATE').toUpperCase();
  const candExp = (candidate.experienceLevel || 'INTERMEDIATE').toUpperCase();
  if (userExp === candExp) {
    proficiencyScore = 100;
    explanation.push(`✓ Compatible experience level (${candExp.toLowerCase()})`);
  } else {
    proficiencyScore = 60;
  }

  // 5. Preferred Learning Style (5% Weight)
  if (user.preferredLearningStyle && candidate.preferredLearningStyle && user.preferredLearningStyle === candidate.preferredLearningStyle) {
    styleScore = 100;
    explanation.push(`✓ Shared learning style preference (${user.preferredLearningStyle.replace('_', ' ')})`);
  } else {
    styleScore = 50;
  }

  // 6. Language Compatibility (5% Weight)
  const userLangs = user.languages || ['English'];
  const candLangs = candidate.languages || ['English'];
  const hasSharedLang = userLangs.some((l) => candLangs.includes(l));
  if (hasSharedLang) {
    languageScore = 100;
    explanation.push(`✓ Shared language (${candLangs.join(', ')})`);
  }

  // Calculate Weighted Score
  const overallScore = Math.round(
    (skillNeedScore * MATCH_WEIGHTS.SKILL_NEED_MATCH +
      reciprocalScore * MATCH_WEIGHTS.RECIPROCAL_MATCH +
      availabilityScore * MATCH_WEIGHTS.AVAILABILITY +
      proficiencyScore * MATCH_WEIGHTS.PROFICIENCY_COMPATIBILITY +
      styleScore * MATCH_WEIGHTS.LEARNING_STYLE +
      languageScore * MATCH_WEIGHTS.LANGUAGE) / 100
  );

  return {
    overallScore,
    explanation,
    matchedSkills,
    reciprocalSkills,
    availabilityCompatibility: availabilityMatch,
    skillCompatibility: Math.round(skillNeedScore),
  };
};

export const generateMatchesForUser = async (userId, goalId = null) => {
  // Handle Mock DB Mode
  if (process.env.MOCK_DB === 'true') {
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
        },
        goal: {
          _id: goalId || 'mock_goal_1',
          title: 'Build an AI-powered SaaS Application',
        },
        matchedSkills: [
          { needSkill: 'UI/UX Design', candidateTeachSkill: 'UI/UX Design' },
        ],
        reciprocalSkills: [
          { candidateLearnSkill: 'React', userTeachSkill: 'React' },
        ],
        availabilityCompatibility: true,
        skillCompatibility: 90,
        overallScore: 94,
        status: 'SUGGESTED',
        explanation: [
          '✓ They teach UI/UX Design, which you need for your goal',
          '✓ You teach React, which they want to learn',
          '✓ Schedule alignment (flexible availability overlaps)',
          '✓ Compatible experience level (advanced)',
          '✓ Shared learning style preference (hands-on)',
        ],
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Find active goal
  let goal = null;
  if (goalId) {
    goal = await Goal.findOne({ _id: goalId, user: userId });
  } else {
    goal = await Goal.findOne({ user: userId, status: 'ACTIVE' }).sort({ createdAt: -1 });
  }

  if (!goal) {
    throw new ApiError(400, 'Please create an active goal blueprint before generating peer matches');
  }

  // Find candidates excluding self
  const candidates = await User.find({ _id: { $ne: userId } });

  const generatedMatches = [];

  for (const candidate of candidates) {
    const analysis = calculateMatchScore(user, candidate, goal);

    // Only save matches with score > 20
    if (analysis.overallScore >= 25) {
      const matchData = {
        user: userId,
        candidate: candidate._id,
        goal: goal._id,
        matchedSkills: analysis.matchedSkills,
        reciprocalSkills: analysis.reciprocalSkills,
        availabilityCompatibility: analysis.availabilityCompatibility,
        skillCompatibility: analysis.skillCompatibility,
        overallScore: analysis.overallScore,
        explanation: analysis.explanation,
        status: 'SUGGESTED',
      };

      const match = await Match.findOneAndUpdate(
        { user: userId, candidate: candidate._id, goal: goal._id },
        matchData,
        { upsert: true, new: true }
      ).populate('candidate', '-password').populate('goal', 'title description');

      generatedMatches.push(match);
    }
  }

  return generatedMatches.sort((a, b) => b.overallScore - a.overallScore);
};

export const getMatchById = async (matchId, userId) => {
  if (process.env.MOCK_DB === 'true') {
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
