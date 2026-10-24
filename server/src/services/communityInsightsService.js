import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import { mockGoalsStore } from './goalService.js';
import Circle from '../models/circleModel.js';
import { mockCirclesStore } from './circleService.js';
import { normalizeSkillName } from '../utils/skillNormalizer.js';

// Minimum learner threshold before a skill cluster is displayed to prevent de-anonymization
export const MIN_GROUP_SIZE_THRESHOLD = 3;

/**
 * Filter to exclude demo accounts and system test emails
 */
const isNonDemoUser = (user) => {
  if (!user) return false;
  if (user.isDemo === true) return false;
  const email = (user.email || '').toLowerCase();
  if (email.includes('demo@enhanceus') || email.endsWith('@enhanceus.org')) {
    return false;
  }
  return true;
};

/**
 * Computes privacy-conscious community skill gap insights
 * from aggregated, non-demo data.
 */
export const getCommunitySkillGapInsights = async () => {
  let nonDemoUsers = [];
  let nonDemoGoals = [];
  let activeCircles = [];

  // Fetch data in either mock DB mode or Mongoose mode
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    // In-memory mock store handling
    nonDemoUsers = [
      {
        _id: 'u1',
        isDemo: false,
        skills: [{ name: 'React', type: 'TEACH' }, { name: 'JavaScript', type: 'TEACH' }],
        learningInterests: [{ name: 'Python' }, { name: 'Docker' }],
      },
      {
        _id: 'u2',
        isDemo: false,
        skills: [{ name: 'Python', type: 'TEACH' }],
        learningInterests: [{ name: 'Docker' }, { name: 'React' }],
      },
      {
        _id: 'u3',
        isDemo: false,
        skills: [{ name: 'HTML5', type: 'TEACH' }],
        learningInterests: [{ name: 'Docker' }, { name: 'Python' }],
      },
      {
        _id: 'u4',
        isDemo: false,
        skills: [{ name: 'CSS3', type: 'TEACH' }],
        learningInterests: [{ name: 'Docker' }, { name: 'React' }],
      },
      {
        _id: 'demo_user',
        isDemo: true, // MUST be excluded
        email: 'demo@enhanceus.org',
        skills: [{ name: 'COBOL', type: 'TEACH' }],
        learningInterests: [{ name: 'COBOL' }],
      },
    ].filter(isNonDemoUser);

    nonDemoGoals = mockGoalsStore.filter((g) => {
      const isDemo = g.user?.isDemo === true || (g.user?.email || '').includes('demo@');
      return !isDemo;
    });

    activeCircles = mockCirclesStore.filter((c) => c.status === 'ACTIVE');
  } else {
    // Real Mongoose DB query: strictly filter out demo accounts
    nonDemoUsers = await User.find({
      isDemo: { $ne: true },
      email: { $not: /@enhanceus\.org$/i },
    })
      .select('skills learningInterests isDemo email')
      .lean();

    const nonDemoUserIds = nonDemoUsers.map((u) => u._id);

    nonDemoGoals = await Goal.find({
      user: { $in: nonDemoUserIds },
    })
      .select('title requiredSkills category')
      .lean();

    activeCircles = await Circle.find({ status: 'ACTIVE' })
      .select('title primarySkill secondarySkills')
      .lean();
  }

  // 1. Check if total non-demo users meets baseline community threshold
  if (nonDemoUsers.length < MIN_GROUP_SIZE_THRESHOLD) {
    return {
      insufficientData: true,
      metadata: {
        minimumGroupThreshold: MIN_GROUP_SIZE_THRESHOLD,
        totalEligibleLearners: nonDemoUsers.length,
        period: 'Current Platform Baseline',
        generatedAt: new Date(),
        demoAccountsExcluded: true,
      },
      message:
        'Community skill-gap insights require at least 3 active non-demo learners to preserve user privacy and prevent de-anonymization. Insights will populate automatically as community membership grows.',
      topRequestedSkills: [],
      teacherDeficitRanking: [],
      circleOpportunities: [],
      categoryDistribution: {},
    };
  }

  // 2. Aggregate Learner Demand (from learningInterests + Goal.requiredSkills)
  const demandSkillUsers = new Map(); // canonicalSkill -> Set of userIds
  const supplySkillUsers = new Map(); // canonicalSkill -> Set of userIds
  const categoryCounts = new Map();

  for (const user of nonDemoUsers) {
    const userIdStr = (user._id || '').toString();

    // Tally target learning interests
    for (const interest of user.learningInterests || []) {
      if (!interest?.name) continue;
      const canonical = normalizeSkillName(interest.name);
      if (!demandSkillUsers.has(canonical)) {
        demandSkillUsers.set(canonical, new Set());
      }
      demandSkillUsers.get(canonical).add(userIdStr);

      const cat = interest.category || 'Software Engineering';
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }

    // Tally teaching skills offered
    for (const skill of user.skills || []) {
      if (!skill?.name) continue;
      const sType = (skill.type || 'TEACH').toUpperCase();
      if (sType === 'TEACH' || sType === 'BOTH') {
        const canonical = normalizeSkillName(skill.name);
        if (!supplySkillUsers.has(canonical)) {
          supplySkillUsers.set(canonical, new Set());
        }
        supplySkillUsers.get(canonical).add(userIdStr);
      }
    }
  }

  // Tally skills from persisted Goals
  for (const goal of nonDemoGoals) {
    const goalUserId = (goal.user?._id || goal.user || '').toString();
    for (const req of goal.requiredSkills || []) {
      if (!req?.name) continue;
      const canonical = normalizeSkillName(req.name);
      if (!demandSkillUsers.has(canonical)) {
        demandSkillUsers.set(canonical, new Set());
      }
      if (goalUserId) {
        demandSkillUsers.get(canonical).add(goalUserId);
      }
    }
  }

  // 3. Circle Coverage Mapping
  const circleCoverage = new Map();
  for (const circle of activeCircles) {
    const primary = normalizeSkillName(circle.primarySkill || '');
    circleCoverage.set(primary, (circleCoverage.get(primary) || 0) + 1);
    for (const sec of circle.secondarySkills || []) {
      const normSec = normalizeSkillName(sec);
      circleCoverage.set(normSec, (circleCoverage.get(normSec) || 0) + 1);
    }
  }

  // 4. Filter by Privacy Threshold (>= MIN_GROUP_SIZE_THRESHOLD)
  const aggregatedSkills = [];

  for (const [skillName, learnerSet] of demandSkillUsers.entries()) {
    const learnerCount = learnerSet.size;
    const teacherCount = supplySkillUsers.get(skillName)?.size || 0;
    const activeCircleCount = circleCoverage.get(skillName) || 0;

    // Enforce privacy threshold: only show skills with >= 3 interested learners
    if (learnerCount >= MIN_GROUP_SIZE_THRESHOLD) {
      const deficitGap = Math.max(0, learnerCount - teacherCount);
      const ratio = teacherCount > 0 ? Math.round((teacherCount / learnerCount) * 100) / 100 : 0;

      let status = 'BALANCED';
      if (deficitGap >= 2) status = 'HIGH_DEMAND';
      if (teacherCount > learnerCount) status = 'SURPLUS';

      aggregatedSkills.push({
        skillName,
        learnerCount,
        teacherCount,
        deficitGap,
        supplyDemandRatio: ratio,
        activeCircleCount,
        status,
      });
    }
  }

  // 5. Sort rankings
  // Top Requested Skills: by learner count descending
  const topRequestedSkills = [...aggregatedSkills]
    .sort((a, b) => b.learnerCount - a.learnerCount)
    .slice(0, 10);

  // Teacher Deficit Ranking: by deficit gap descending
  const teacherDeficitRanking = [...aggregatedSkills]
    .filter((s) => s.deficitGap > 0)
    .sort((a, b) => b.deficitGap - a.deficitGap)
    .map((s) => ({
      skillName: s.skillName,
      learnersWaiting: s.learnerCount,
      availableMentors: s.teacherCount,
      deficitGap: s.deficitGap,
      urgency: s.deficitGap >= 3 ? 'CRITICAL_SHORTAGE' : 'MODERATE_SHORTAGE',
    }))
    .slice(0, 8);

  // Circle Opportunities: skills with >= threshold learners and 0 active circles
  const circleOpportunities = [...aggregatedSkills]
    .filter((s) => s.activeCircleCount === 0 && s.learnerCount >= MIN_GROUP_SIZE_THRESHOLD)
    .sort((a, b) => b.learnerCount - a.learnerCount)
    .map((s) => ({
      skillName: s.skillName,
      interestedLearners: s.learnerCount,
      activeCircles: 0,
      opportunityType: 'HIGH_IMPACT_UNMET_DEMAND',
      recommendation: `Launch a "${s.skillName} Study Group" to address community demand.`,
    }))
    .slice(0, 5);

  // Format category distribution
  const formattedCategories = {};
  for (const [cat, count] of categoryCounts.entries()) {
    if (count >= MIN_GROUP_SIZE_THRESHOLD) {
      formattedCategories[cat] = count;
    }
  }

  return {
    insufficientData: aggregatedSkills.length === 0,
    metadata: {
      minimumGroupThreshold: MIN_GROUP_SIZE_THRESHOLD,
      totalEligibleLearners: nonDemoUsers.length,
      skillsAnalyzed: demandSkillUsers.size,
      qualifyingSkillsSurfaced: aggregatedSkills.length,
      period: 'Aggregated Live Community Activity',
      generatedAt: new Date(),
      demoAccountsExcluded: true,
      privacyPolicy: 'Individual user identities, goals, and private messages are strictly withheld from community aggregation.',
    },
    topRequestedSkills,
    teacherDeficitRanking,
    circleOpportunities,
    categoryDistribution: formattedCategories,
  };
};

export default {
  getCommunitySkillGapInsights,
  MIN_GROUP_SIZE_THRESHOLD,
};
