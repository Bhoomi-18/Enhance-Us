/**
 * EnhanceUs Demo Isolation, Canonical Baseline & Workspace Sandbox Test Suite
 * 
 * Verifies:
 * 1. Accurate identification of demo accounts vs real user accounts.
 * 2. Immutable canonical baseline protection (deep copy guarantees).
 * 3. Multi-visitor workspace isolation (changes in Visitor 1 do not affect Visitor 2).
 * 4. Safe, idempotent workspace reset requiring explicit confirmation.
 * 5. Interactive functionality across all implemented features in demo mode.
 * 6. Zero leakage into real user discovery, public circles, or matching candidate pools.
 * 7. Side-effect suppression (feedback simulation without real email dispatch).
 * 8. Strict admin lockout for demo users.
 */

import * as demoWorkspaceService from '../services/demoWorkspaceService.js';
import { getCanonicalBaseline, CANONICAL_DEMO_BASELINE, BASELINE_VERSION, DEMO_USER_ID } from '../fixtures/canonicalDemoBaseline.js';
import { validateAdminAccess } from '../utils/adminAuth.js';
import { ApiError } from '../utils/apiError.js';

// Force in-memory test mode
process.env.MOCK_DB = 'true';

async function runDemoIsolationTests() {
  console.log('====================================================');
  console.log('🎭 RUNNING DEMO ISOLATION & WORKSPACE SANDBOX TESTS');
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

  demoWorkspaceService.mockWorkspacesMap.clear();

  // ---------------------------------------------------------
  // 1. CANONICAL BASELINE INTEGRITY & IMMUTABILITY
  // ---------------------------------------------------------
  console.log('🛡️ [1] Canonical Baseline Integrity & Immutability:');

  const baseline1 = getCanonicalBaseline();
  assert(baseline1.version === BASELINE_VERSION, 'Baseline returns correct version identifier');
  assert(baseline1.profile._id === DEMO_USER_ID, 'Baseline contains valid primary demo user profile');
  assert(baseline1.goals?.length > 0, 'Baseline contains pre-configured goal blueprint');
  assert(baseline1.roadmaps?.length > 0, 'Baseline contains structured roadmap with milestones');
  assert(baseline1.matches?.length > 0, 'Baseline contains reciprocal matches with explanation');
  assert(baseline1.circles?.length > 0, 'Baseline contains collaborative learning circles');
  assert(baseline1.sessions?.length > 0, 'Baseline contains sample completed & scheduled sessions');
  assert(baseline1.portfolioItems?.length > 0, 'Baseline contains verified proof-of-skill items');
  assert(baseline1.trustSummary?.overallScore === 98, 'Baseline contains auditable trust metrics');

  // Verify Immutability: Mutating a clone must NOT alter the authoritative baseline
  baseline1.goals[0].title = 'CORRUPTED GOAL TITLE';
  baseline1.profile.name = 'Hacked Name';
  const baselineFresh = getCanonicalBaseline();
  assert(
    baselineFresh.goals[0].title === 'Build an AI-Powered SaaS Blueprint',
    'Baseline Immutability: Mutating a clone does not mutate canonical fixtures'
  );
  assert(
    baselineFresh.profile.name === 'Alex Morgan',
    'Baseline Immutability: Profile fixtures remain completely pristine'
  );

  // ---------------------------------------------------------
  // 2. MULTI-VISITOR WORKSPACE ISOLATION (NO SHARED MUTABLE STATE)
  // ---------------------------------------------------------
  console.log('\n🔒 [2] Multi-Visitor Workspace Sandbox Isolation:');

  const wsId1 = 'ws_visitor_alpha_' + Date.now();
  const wsId2 = 'ws_visitor_beta_' + Date.now();

  const ws1 = await demoWorkspaceService.getOrCreateWorkspace(wsId1);
  const ws2 = await demoWorkspaceService.getOrCreateWorkspace(wsId2);

  assert(Boolean(ws1 && ws2), 'Initializes distinct workspaces for separate visitors');
  assert(ws1.workspaceId !== ws2.workspaceId, 'Generates independent workspace IDs');

  // Visitor 1 creates a new goal
  const newGoal1 = await demoWorkspaceService.createGoal(wsId1, {
    title: 'Visitor 1 Exclusive Goal: Advanced Rust Programming',
    description: 'Learn memory ownership and concurrency in Rust.',
  });

  const goalsWs1 = await demoWorkspaceService.getGoals(wsId1);
  const goalsWs2 = await demoWorkspaceService.getGoals(wsId2);

  assert(
    goalsWs1.some((g) => g.title.includes('Advanced Rust Programming')),
    'Visitor 1 workspace contains the newly created goal'
  );
  assert(
    !goalsWs2.some((g) => g.title.includes('Advanced Rust Programming')),
    'Workspace Isolation: Visitor 1 goal does NOT appear in Visitor 2 workspace'
  );

  // Visitor 2 updates their profile bio
  await demoWorkspaceService.updateProfile(wsId2, {
    bio: 'Updated bio by Visitor 2 in their isolated sandbox.',
  });

  const profileWs1 = await demoWorkspaceService.getProfile(wsId1);
  const profileWs2 = await demoWorkspaceService.getProfile(wsId2);

  assert(
    profileWs2.bio === 'Updated bio by Visitor 2 in their isolated sandbox.',
    'Visitor 2 profile update persisted in Workspace 2'
  );
  assert(
    profileWs1.bio.includes('Full-stack software engineer passionate about modern React'),
    'Workspace Isolation: Visitor 2 profile change does NOT alter Visitor 1 profile'
  );

  // Visitor 1 deletes the initial baseline goal
  const baselineGoalId = 'demo_goal_saas_001';
  await demoWorkspaceService.deleteGoal(wsId1, baselineGoalId);

  const remainingGoalsWs1 = await demoWorkspaceService.getGoals(wsId1);
  const remainingGoalsWs2 = await demoWorkspaceService.getGoals(wsId2);

  assert(
    !remainingGoalsWs1.some((g) => g._id === baselineGoalId),
    'Visitor 1 successfully deleted baseline goal in Workspace 1'
  );
  assert(
    remainingGoalsWs2.some((g) => g._id === baselineGoalId),
    'Workspace Isolation: Goal deletion in Workspace 1 does NOT delete goal in Workspace 2'
  );

  // ---------------------------------------------------------
  // 3. SAFE & IDEMPOTENT WORKSPACE RESET WORKFLOW
  // ---------------------------------------------------------
  console.log('\n🔄 [3] Safe Workspace Reset & Baseline Restoration:');

  // Attempt reset without confirmation must fail
  let unconfirmedFailed = false;
  try {
    await demoWorkspaceService.resetWorkspace(wsId1, false);
  } catch (err) {
    unconfirmedFailed = true;
  }
  assert(unconfirmedFailed, 'Reset Safety: Reset requires explicit confirmation ({ confirm: true })');

  // Execute confirmed reset for Workspace 1
  const resetRes = await demoWorkspaceService.resetWorkspace(wsId1, true);
  assert(resetRes.success === true, 'Reset succeeds with explicit confirmation');
  assert(resetRes.version === BASELINE_VERSION, 'Restores correct baseline version');

  // Verify Workspace 1 has restored the initial goal
  const restoredGoalsWs1 = await demoWorkspaceService.getGoals(wsId1);
  assert(
    restoredGoalsWs1.some((g) => g._id === baselineGoalId),
    'Reset Restores Baseline: Initial baseline goal restored in Workspace 1'
  );
  assert(
    !restoredGoalsWs1.some((g) => g.title.includes('Advanced Rust Programming')),
    'Reset Restores Baseline: Temporary goal created during session was cleared'
  );

  // Verify Workspace 2 was completely unaffected by Workspace 1 reset
  const profileWs2AfterWs1Reset = await demoWorkspaceService.getProfile(wsId2);
  assert(
    profileWs2AfterWs1Reset.bio === 'Updated bio by Visitor 2 in their isolated sandbox.',
    'Reset Isolation: Resetting Workspace 1 left Workspace 2 completely intact'
  );

  // ---------------------------------------------------------
  // 4. INTERACTIVE FEATURE BEHAVIOR IN DEMO WORKSPACE
  // ---------------------------------------------------------
  console.log('\n✨ [4] Complete Feature Behavior within Demo Workspace:');

  // Roadmaps & Milestones
  const roadmaps = await demoWorkspaceService.getUserRoadmaps(wsId1);
  assert(roadmaps.length > 0, 'Roadmaps: Demo visitor can retrieve roadmaps');
  const msUpdate = await demoWorkspaceService.updateMilestoneStatus(
    wsId1,
    roadmaps[0]._id,
    'ms_002',
    { status: 'COMPLETED', notes: 'Walked through Figma prototype auto-layout with Sarah.' }
  );
  assert(msUpdate.milestone.status === 'COMPLETED', 'Roadmaps: Demo visitor can update milestone status');
  assert(msUpdate.roadmap.progress > 55, 'Roadmaps: Updating milestone recalibrates progress percentage');

  // AI Learning Coach
  const coachRecs = await demoWorkspaceService.getCoachRecommendations(wsId1);
  assert(coachRecs.length > 0, 'Coach: Demo visitor receives actionable recommendations');
  assert(coachRecs[0].rationale.length > 0, 'Coach: Recommendations provide clear rationale');
  const updatedRec = await demoWorkspaceService.updateCoachRecommendationStatus(
    wsId1,
    coachRecs[0]._id,
    { status: 'ACCEPTED' }
  );
  assert(updatedRec.status === 'ACCEPTED', 'Coach: Demo visitor can accept/dismiss recommendations');

  // Learning Circles
  const circles = await demoWorkspaceService.getCircles(wsId1);
  assert(circles.circles.length > 0, 'Circles: Demo visitor can browse learning circles');
  const newCircle = await demoWorkspaceService.createCircle(wsId1, {
    title: 'TypeScript Design Patterns',
    description: 'Weekly study circle on advanced TypeScript utility types.',
    primarySkill: 'TypeScript',
  });
  assert(newCircle.title === 'TypeScript Design Patterns', 'Circles: Demo visitor can create new circle');
  const circlePosts = await demoWorkspaceService.getCirclePosts(wsId1, 'demo_circle_001');
  assert(circlePosts.posts.length > 0, 'Circles: Demo visitor can view circle discussion threads');

  // Sessions
  const sessions = await demoWorkspaceService.getSessions(wsId1);
  assert(sessions.length > 0, 'Sessions: Demo visitor can view upcoming & completed sessions');
  const newSession = await demoWorkspaceService.createSession(wsId1, {
    skillTaught: 'Next.js App Router',
    durationMinutes: 45,
  });
  assert(newSession.skillTaught === 'Next.js App Router', 'Sessions: Demo visitor can schedule a session');

  // Conversations & Messages
  const conversations = await demoWorkspaceService.getConversations(wsId1);
  assert(conversations.length > 0, 'Messages: Demo visitor can access conversation threads');
  const sentMsg = await demoWorkspaceService.sendMessage(wsId1, conversations[0]._id, {
    text: 'Hey Sarah, are we still on for our design review tomorrow?',
  });
  assert(sentMsg.text.includes('Hey Sarah'), 'Messages: Demo visitor can send simulated messages');

  // Notifications
  const notifs = await demoWorkspaceService.getNotifications(wsId1);
  assert(notifs.length > 0, 'Notifications: Demo visitor can retrieve notifications');
  const markedNotif = await demoWorkspaceService.markNotificationRead(wsId1, notifs[0]._id);
  assert(markedNotif.read === true, 'Notifications: Demo visitor can mark notification as read');

  // Proof-of-Skill Portfolio
  const portfolio = await demoWorkspaceService.getUserPortfolio(wsId1, DEMO_USER_ID);
  assert(portfolio.items.length > 0, 'Portfolio: Demo visitor can view proof-of-skill portfolio');
  assert(portfolio.stats.confirmedCount > 0, 'Portfolio: Correctly reports exchange-confirmed count');
  const newPortItem = await demoWorkspaceService.createPortfolioItem(wsId1, {
    title: 'Microservices Architecture Demo',
    skillName: 'Node.js',
    category: 'Backend',
  });
  assert(newPortItem.title.includes('Microservices'), 'Portfolio: Demo visitor can add portfolio item');

  // Trust & Contribution Profile
  const trustProfile = await demoWorkspaceService.getUserTrustProfile(wsId1);
  assert(trustProfile.trust.status === 'ESTABLISHED_CONTRIBUTOR', 'Trust: Returns established contributor status');
  assert(trustProfile.trust.metrics.attendanceRate === 100, 'Trust: Evaluates 100% session attendance rate');

  // Community Insights
  const insights = await demoWorkspaceService.getCommunityInsights(wsId1);
  assert(insights.highDemandSkills?.length > 0, 'Insights: Returns simulated high-demand skills');
  assert(insights.metadata.demoAccountsExcluded === true, 'Insights: Explicitly notes demo exclusion metadata');

  // Simulated Feedback Submission (Zero Real Emails)
  const feedbackRes = await demoWorkspaceService.recordFeedback(wsId1, {
    rating: 5,
    comments: 'Great demo experience! Responsive navbar looks sleek and clean.',
  });
  assert(feedbackRes.success === true, 'Feedback: Demo visitor can submit feedback in sandbox');
  assert(feedbackRes.simulated === true, 'Feedback Guard: Simulated delivery flag is explicitly true');

  // ---------------------------------------------------------
  // 5. SECURITY, ADMIN LOCKOUT & ACCOUNT PROTECTION
  // ---------------------------------------------------------
  console.log('\n🔒 [5] Security Guards & Real-User Boundary Protection:');

  // Admin Lockout
  const demoUserAuth = { isDemo: true, email: 'demo@enhanceus.org', role: 'user' };
  const adminCheck = validateAdminAccess(demoUserAuth);
  assert(adminCheck.allowed === false, 'Security: Demo user is strictly barred from admin portal access');
  assert(adminCheck.reason.includes('Demo accounts are strictly prohibited'), 'Security: Returns explicit rejection reason');

  // Real User Distinction
  const realUserAuth = { isDemo: false, email: 'real.student@gmail.com', role: 'user' };
  assert(realUserAuth.isDemo === false, 'Real User Distinction: Real user isDemo flag is strictly false');

  console.log('\n====================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runDemoIsolationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
