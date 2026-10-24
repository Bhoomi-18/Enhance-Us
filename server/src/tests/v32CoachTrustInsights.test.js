/**
 * EnhanceUs V3.2 — Adaptive AI Learning Coach, Trust System, and Community Insights Test Suite
 * 
 * Verifies:
 * 1. AI Coach recommendation generation with genuine user context and deterministic fallback.
 * 2. Prerequisite gap detection and actionable next-milestone prioritization.
 * 3. Graceful handling of missing/incomplete user profile information.
 * 4. Recommendation lifecycle states (PENDING -> ACCEPTED -> COMPLETED / DISMISSED).
 * 5. Re-recommendation avoidance for dismissed topics.
 * 6. Ownership enforcement on recommendation state mutations.
 * 7. Interactive coach consultation with safe fallback.
 * 8. Trust & Contribution system calculation from underlying application records.
 * 9. Explicit formulas, attendance rate with cancellation exclusions, and sample sizes.
 * 10. Newcomer safety protection without unfair low baseline scores.
 * 11. Community skill-gap insights aggregation with minimum group threshold (>= 3).
 * 12. Strict exclusion of demo accounts from community analytics.
 * 13. Informative empty state handling when data volume is below privacy threshold.
 */

import * as coachService from '../services/coachService.js';
import { mockCoachRecommendationsStore } from '../services/coachService.js';
import * as trustService from '../services/trustService.js';
import * as communityInsightsService from '../services/communityInsightsService.js';
import { mockSessionsStore } from '../services/sessionService.js';
import { mockReviewsStore } from '../services/reviewService.js';
import { mockCirclesStore } from '../services/circleService.js';
import { mockPortfolioStore } from '../services/portfolioService.js';
import { mockGoalsStore } from '../services/goalService.js';
import { mockRoadmapsStore } from '../services/roadmapService.js';

// Activate mock DB mode for in-memory testing
process.env.MOCK_DB = 'true';

async function runV32Tests() {
  console.log('====================================================');
  console.log('🌟 ENHANCEUS V3.2: COACH, TRUST & INSIGHTS TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, extra = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extra}`);
      failed++;
    }
  };

  // Reset all mock stores
  mockCoachRecommendationsStore.length = 0;
  mockSessionsStore.length = 0;
  mockReviewsStore.length = 0;
  mockCirclesStore.length = 0;
  mockPortfolioStore.length = 0;
  mockGoalsStore.length = 0;
  mockRoadmapsStore.length = 0;

  const testUserA = { _id: 'user_a_101', name: 'Dev Alice', email: 'alice@test.org' };
  const testUserB = { _id: 'user_b_202', name: 'Mentor Bob', email: 'bob@test.org' };
  const testNewbie = { _id: 'user_c_new', name: 'Newcomer Charlie', email: 'charlie@test.org' };

  // =========================================================================
  // SECTION 1: AI LEARNING COACH & ADAPTIVE ROADMAPS
  // =========================================================================
  console.log('--- 1. AI Coach: Recommendations & Deterministic Fallback ---');

  // Setup active roadmap with prerequisite dependency
  const sampleRoadmap = {
    _id: 'roadmap_mern_01',
    user: testUserA._id,
    title: 'Full Stack MERN Architecture',
    stages: [
      {
        order: 1,
        title: 'Core Fundamentals',
        milestones: [
          {
            _id: 'ms_01',
            title: 'Express REST Endpoints',
            description: 'Implement CRUD controllers with input validation',
            skillName: 'Express.js',
            prerequisites: ['JavaScript'],
            isCompleted: false,
          },
          {
            _id: 'ms_02',
            title: 'Advanced React State Patterns',
            description: 'Redux Toolkit and Context API optimization',
            skillName: 'React',
            prerequisites: ['TypeScript'], // Missing prerequisite for testing gap
            isCompleted: false,
          },
        ],
      },
    ],
  };
  mockRoadmapsStore.push(sampleRoadmap);

  // Setup an active circle for interest match
  mockCirclesStore.push({
    _id: 'circle_ts_01',
    title: 'TypeScript Mastery Cohort',
    primarySkill: 'TypeScript',
    secondarySkills: ['Node.js'],
    status: 'ACTIVE',
    members: [{ user: testUserB._id, role: 'OWNER' }],
  });

  // Test 1.1: Fetch recommendations with deterministic rules
  const recsResult = await coachService.getPersonalizedRecommendations(testUserA._id);
  assert(recsResult && Array.isArray(recsResult.recommendations), 'Returns recommendations array');
  assert(recsResult.recommendations.length > 0, 'Generates actionable recommendations for active learner');
  assert(recsResult.source === 'DETERMINISTIC_RULES', 'Falls back safely to deterministic rules engine when offline');

  // Test 1.2: Check that each recommendation contains an explicit rationale
  const hasRationales = recsResult.recommendations.every(
    (r) => typeof r.rationale === 'string' && r.rationale.length > 10
  );
  assert(hasRationales, 'All recommendations provide explicit rationale explaining relevance');

  // Test 1.3: Check prerequisite awareness (milestone next step vs prerequisite practice)
  const milestoneRec = recsResult.recommendations.find((r) => r.type === 'MILESTONE_NEXT_STEP');
  assert(
    milestoneRec && milestoneRec.title.includes('Express REST Endpoints'),
    'Recommends immediate next available milestone ("Express REST Endpoints")'
  );

  // Test 1.4: Check circle recommendation based on learning interest
  const circleRec = recsResult.recommendations.find((r) => r.type === 'LEARNING_CIRCLE');
  assert(
    circleRec && circleRec.associatedSkill === 'TypeScript',
    'Recommends relevant active learning circle matching target interest'
  );

  // =========================================================================
  // SECTION 2: RECOMMENDATION LIFECYCLE (ACCEPT, COMPLETE, DISMISS)
  // =========================================================================
  console.log('\n--- 2. Recommendation Lifecycle & Avoidance of Dismissed Topics ---');

  const targetRec = recsResult.recommendations[0];

  // Test 2.1: Accept recommendation
  const accepted = await coachService.updateRecommendationStatus(testUserA._id, targetRec._id, {
    status: 'ACCEPTED',
  });
  assert(accepted.status === 'ACCEPTED', 'Successfully updates recommendation status to ACCEPTED');

  // Test 2.2: Ownership validation guard
  let unauthorizedError = false;
  try {
    await coachService.updateRecommendationStatus(testUserB._id, targetRec._id, {
      status: 'DISMISSED',
    });
  } catch (err) {
    unauthorizedError = err.statusCode === 403;
  }
  assert(unauthorizedError, 'Enforces record ownership: other users cannot mutate recommendations');

  // Test 2.3: Dismissal with reason
  const dismissed = await coachService.updateRecommendationStatus(testUserA._id, targetRec._id, {
    status: 'DISMISSED',
    dismissalReason: 'ALREADY_KNOW_THIS',
    userFeedback: 'I have production experience with Express REST endpoints',
  });
  assert(dismissed.status === 'DISMISSED', 'Successfully marks recommendation as DISMISSED');
  assert(dismissed.dismissalReason === 'ALREADY_KNOW_THIS', 'Stores user dismissal reason for adaptive learning');

  // Test 2.4: Deterministic re-recommendation avoidance
  const refreshedRecs = await coachService.getPersonalizedRecommendations(testUserA._id, { forceRefresh: true });
  const repeatedDismissed = refreshedRecs.recommendations.some(
    (r) => (r.title || '').toLowerCase() === (dismissed.title || '').toLowerCase()
  );
  assert(!repeatedDismissed, 'Avoids repeatedly recommending dismissed items on refresh');

  // Test 2.5: Interactive Coach Advice
  const advice = await coachService.askCoach(testUserA._id, 'How do I test my understanding with an exercise?');
  assert(advice && typeof advice.response === 'string' && advice.response.length > 20, 'Returns structured coaching advice');
  assert(Array.isArray(advice.suggestedNextSteps), 'Returns actionable follow-up checklist steps');

  // =========================================================================
  // SECTION 3: TRUST & CONTRIBUTION SYSTEM
  // =========================================================================
  console.log('\n--- 3. Auditable Trust & Contribution Metrics ---');

  // Populate verified session records for User A
  // 3 completed 1-on-1 sessions, 1 completed group session, 1 mutually cancelled (should NOT penalize)
  mockSessionsStore.push(
    {
      _id: 'sess_01',
      host: testUserB._id,
      participants: [testUserA._id, testUserB._id],
      status: 'COMPLETED',
      isGroupSession: false,
    },
    {
      _id: 'sess_02',
      host: testUserA._id,
      participants: [testUserA._id, testUserB._id],
      status: 'COMPLETED',
      isGroupSession: false,
    },
    {
      _id: 'sess_03',
      host: testUserB._id,
      participants: [testUserA._id, testUserB._id],
      status: 'COMPLETED',
      isGroupSession: false,
    },
    {
      _id: 'sess_04',
      host: testUserB._id,
      participants: [testUserA._id, testUserB._id],
      status: 'COMPLETED',
      isGroupSession: true,
    },
    {
      _id: 'sess_05_cancelled',
      host: testUserA._id,
      participants: [testUserA._id, testUserB._id],
      status: 'CANCELLED', // Mutually cancelled: excluded from attendance denominator
      isGroupSession: false,
    }
  );

  // Populate peer reviews from Bob to Alice
  mockReviewsStore.push(
    {
      _id: 'rev_01',
      session: 'sess_01',
      reviewer: testUserB._id,
      reviewee: testUserA._id,
      teachingRating: 5,
      communicationRating: 5,
      reliabilityRating: 5,
      overallRating: 5.0,
      feedbackText: 'Outstanding mentor with deep architectural clarity.',
    },
    {
      _id: 'rev_02',
      session: 'sess_02',
      reviewer: testUserB._id,
      reviewee: testUserA._id,
      teachingRating: 4,
      communicationRating: 5,
      reliabilityRating: 4,
      overallRating: 4.3,
      feedbackText: 'Very patient and great communication.',
    }
  );

  // Attempt self-review to verify prevention
  mockReviewsStore.push({
    _id: 'rev_invalid_self',
    session: 'sess_03',
    reviewer: testUserA._id, // SELF REVIEW! Must be filtered out
    reviewee: testUserA._id,
    teachingRating: 5,
    communicationRating: 5,
    reliabilityRating: 5,
    overallRating: 5.0,
  });

  // Populate portfolio items for User A
  mockPortfolioStore.push(
    {
      _id: 'port_01',
      user: testUserA._id,
      title: 'Full Stack Microservices Architecture',
      verificationStatus: 'EXCHANGE_CONFIRMED',
    },
    {
      _id: 'port_02',
      user: testUserA._id,
      title: 'Open Source Tooling Contribution',
      verificationStatus: 'PORTFOLIO_EVIDENCE',
    }
  );

  // Test 3.1: Retrieve auditable trust profile for established user
  const trustProfileA = await trustService.getTrustAndContributionProfile(testUserA._id);
  assert(trustProfileA && trustProfileA.standing, 'Generates trust & contribution profile');
  assert(trustProfileA.standing.status === 'VERIFIED_CONTRIBUTOR', 'Recognizes established contributor status');
  assert(typeof trustProfileA.standing.formula === 'string', 'Returns transparent formula explanation');
  assert(typeof trustProfileA.standing.exclusions === 'string', 'Returns auditable exclusions documentation');

  // Test 3.2: Attendance rate calculation and cancellation exclusion
  // 4 completed, 0 missed. Rate = 100%. Cancelled session excluded.
  assert(
    trustProfileA.metrics.exchanges.completedTotal === 4,
    `Calculates correct completed sessions count (4 expected, got ${trustProfileA.metrics.exchanges.completedTotal})`
  );
  assert(
    trustProfileA.metrics.exchanges.attendanceRateNumeric === 100,
    'Excludes mutually cancelled sessions from attendance penalty (100% attendance rate)'
  );

  // Test 3.3: Self-rating exclusion & peer feedback sample size
  // 2 valid reviews (self-rating excluded)
  assert(
    trustProfileA.metrics.peerFeedback.sampleSize === 2,
    `Excludes self-ratings from sample size (2 expected, got ${trustProfileA.metrics.peerFeedback.sampleSize})`
  );
  assert(
    trustProfileA.metrics.peerFeedback.overallRatingAverage === 4.7,
    `Computes accurate peer feedback rating average (4.7 expected, got ${trustProfileA.metrics.peerFeedback.overallRatingAverage})`
  );

  // Test 3.4: Verified portfolio artifact tally
  assert(
    trustProfileA.metrics.portfolioEvidence.exchangeConfirmed === 1,
    'Tracks EXCHANGE_CONFIRMED portfolio achievements'
  );
  assert(
    trustProfileA.metrics.portfolioEvidence.portfolioEvidence === 1,
    'Tracks PORTFOLIO_EVIDENCE portfolio achievements'
  );

  // Test 3.5: Newcomer Fairness Protection
  const newbieProfile = await trustService.getTrustAndContributionProfile(testNewbie._id);
  assert(newbieProfile.isNewContributor === true, 'Correctly detects newcomer with no session history');
  assert(newbieProfile.standing.status === 'NEW_CONTRIBUTOR', 'Assigns NEW_CONTRIBUTOR status to newcomers');
  assert(
    newbieProfile.standing.score === null,
    'Does not penalize new users with zero or failing score (score is null/baseline)'
  );

  // =========================================================================
  // SECTION 4: PRIVACY-CONSCIOUS COMMUNITY SKILL-GAP INSIGHTS
  // =========================================================================
  console.log('\n--- 4. Community Skill-Gap Insights & Privacy Thresholds ---');

  const insights = await communityInsightsService.getCommunitySkillGapInsights();
  assert(insights && typeof insights === 'object', 'Generates community insights response');
  assert(insights.metadata.demoAccountsExcluded === true, 'Strictly excludes demo accounts from analytics');
  assert(
    insights.metadata.minimumGroupThreshold === communityInsightsService.MIN_GROUP_SIZE_THRESHOLD,
    'Enforces minimum group size threshold (3) to prevent de-anonymization'
  );

  // Test 4.1: Verify threshold filtering
  // In our mock store, 'Docker' has 4 learners (>= 3 threshold) and 0 teachers -> should surface
  const dockerInsight = insights.topRequestedSkills.find((s) => s.skillName.toLowerCase() === 'docker');
  assert(
    Boolean(dockerInsight),
    'Surfaces high-demand skill "Docker" with learner count above privacy threshold (>=3)'
  );

  // Test 4.2: Teacher deficit ranking
  const deficitDocker = insights.teacherDeficitRanking.find((s) => s.skillName.toLowerCase() === 'docker');
  assert(
    deficitDocker && deficitDocker.deficitGap >= 3,
    'Correctly identifies Docker as a teacher deficit shortage'
  );

  // Test 4.3: Circle opportunities detection
  const dockerCircleOpp = insights.circleOpportunities.find((c) => c.skillName.toLowerCase() === 'docker');
  assert(
    Boolean(dockerCircleOpp),
    'Surfaces high-impact circle opportunity for Docker (high unmet learner demand, 0 active circles)'
  );

  // Test 4.4: Privacy protection: No individual user IDs or private emails exposed
  const jsonStr = JSON.stringify(insights);
  assert(
    !jsonStr.includes('alice@test.org') && !jsonStr.includes('user_a_101'),
    'Strict privacy guard: No individual user emails or IDs are leaked in aggregated community analytics'
  );

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL V3.2 TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runV32Tests().catch((err) => {
  console.error('Fatal Test Harness Error:', err);
  process.exit(1);
});
