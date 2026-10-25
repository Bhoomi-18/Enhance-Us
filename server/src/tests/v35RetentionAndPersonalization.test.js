import http from 'http';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Session from '../models/sessionModel.js';
import Review from '../models/reviewModel.js';
import Notification from '../models/notificationModel.js';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';
import { createFilteredNotification } from '../services/notificationService.js';
import { getAdminOverviewMetrics } from '../services/adminService.js';

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null, extraHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

async function runV35RetentionAndPersonalizationSuite() {
  console.log('================================================================');
  console.log('🚀 ENHANCEUS V3.5 USER RETENTION & PERSONALIZATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    const connectDB = (await import('../config/db.js')).default;
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    // -------------------------------------------------------------
    // SETUP: Authentic test users and sessions
    // -------------------------------------------------------------
    console.log('--- Phase 1: Setup Authenticated Test Users ---');
    const timestamp = Date.now();
    const userAEmail = `v35_user_a_${timestamp}@enhanceus.org`;
    const userBEmail = `v35_user_b_${timestamp}@enhanceus.org`;
    const testPassword = 'Password123!';

    // Register User A
    const regResA = await request('/auth/register', 'POST', {
      name: 'Alice Learner',
      email: userAEmail,
      password: testPassword,
    });
    assert(regResA.status === 201 && regResA.data?.data?.token, 'User A registered successfully');
    const tokenA = regResA.data?.data?.token;
    const userAId = regResA.data?.data?.user?._id;

    // Register User B
    const regResB = await request('/auth/register', 'POST', {
      name: 'Bob Mentor',
      email: userBEmail,
      password: testPassword,
    });
    assert(regResB.status === 201 && regResB.data?.data?.token, 'User B registered successfully');
    const tokenB = regResB.data?.data?.token;
    const userBId = regResB.data?.data?.user?._id;

    // Login Demo User
    const demoRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoRes.status === 200 && demoRes.data?.data?.token, 'Demo user authenticated into isolated sandbox');
    const demoToken = demoRes.data?.data?.token;

    // Mark email verified directly in DB for full feature access if connected
    if (User.db?.readyState === 1) {
      await User.updateMany(
        { _id: { $in: [userAId, userBId] } },
        { $set: { emailVerified: true } }
      );
    }

    // -------------------------------------------------------------
    // TEST 1: New-User Dashboard Feed & Empty State Handling
    // -------------------------------------------------------------
    console.log('\n--- Phase 2: New-User Dashboard & Empty States ---');
    const newDashboardRes = await request('/users/dashboard', 'GET', null, tokenA);
    assert(newDashboardRes.status === 200, 'GET /api/users/dashboard returns 200 for authenticated user');
    const newFeed = newDashboardRes.data?.data;
    assert(newFeed !== undefined, 'Dashboard feed response structure is valid');
    assert(Array.isArray(newFeed?.nextBestActions), 'Feed includes nextBestActions array');
    assert(Array.isArray(newFeed?.activityTimeline), 'Feed includes activityTimeline array');
    assert(newFeed?.unfinishedLearning === null, 'New user has unfinishedLearning === null');
    assert(newFeed?.onboarding !== undefined, 'Feed includes onboarding status');
    assert(newFeed?.onboarding?.isCompleted === false, 'New user onboarding is not completed');
    assert(newFeed?.onboarding?.steps?.length === 3, 'Onboarding includes 3 actionable steps');
    assert(newFeed?.returnSummary?.greeting?.includes('Alice'), 'Return greeting addresses user respectfully by name');

    // -------------------------------------------------------------
    // TEST 2: Learning Continuity & Unfinished Goals (Pause / Resume)
    // -------------------------------------------------------------
    console.log('\n--- Phase 3: Learning Continuity & Goal Pause/Resume ---');
    const createGoalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Full-Stack TypeScript Architecture',
        description: 'Build enterprise microservices with React frontend, Node backend, and Docker containerization.',
      },
      tokenA
    );
    assert(createGoalRes.status === 201, 'User A created goal blueprint');
    const goalAId = createGoalRes.data?.data?.goal?._id;

    // Fetch dashboard again to verify unfinished learning is now populated
    const feedWithGoalRes = await request('/users/dashboard', 'GET', null, tokenA);
    const feedWithGoal = feedWithGoalRes.data?.data;
    assert(feedWithGoal?.unfinishedLearning !== null, 'Dashboard derives unfinished learning from active goal');
    assert(
      feedWithGoal?.unfinishedLearning?.title === 'Master Full-Stack TypeScript Architecture',
      'Unfinished learning matches user active goal title'
    );
    assert(
      feedWithGoal?.unfinishedLearning?.status === 'ACTIVE',
      'Unfinished learning status is ACTIVE'
    );

    // Pause the goal
    const pauseRes = await request(`/goals/${goalAId}`, 'PATCH', { status: 'PAUSED' }, tokenA);
    assert(pauseRes.status === 200, 'Goal status successfully updated to PAUSED');

    const feedPausedRes = await request('/users/dashboard', 'GET', null, tokenA);
    const feedPaused = feedPausedRes.data?.data;
    assert(feedPaused?.unfinishedLearning?.status === 'PAUSED', 'Unfinished learning reflects PAUSED state');
    const resumeAction = feedPaused?.nextBestActions?.find((a) => a.type === 'RESUME_GOAL');
    assert(resumeAction !== undefined, 'Next best actions includes RESUME_GOAL when goal is paused');
    assert(resumeAction?.actionLabel === 'Resume Learning', 'Action label is "Resume Learning"');

    // Resume the goal back to ACTIVE
    const resumeRes = await request(`/goals/${goalAId}`, 'PATCH', { status: 'ACTIVE' }, tokenA);
    assert(resumeRes.status === 200, 'Goal status successfully resumed back to ACTIVE');

    // -------------------------------------------------------------
    // TEST 3: Personalized Next-Best Actions & Prioritization
    // -------------------------------------------------------------
    console.log('\n--- Phase 4: Next-Best Actions & Prioritization ---');
    // Simulate a completed session between User A and User B needing review
    if (Session.db?.readyState === 1) {
      const pastSession = await Session.create({
        participants: [userAId, userBId],
        host: userBId,
        date: new Date(Date.now() - 3600000),
        time: '14:00',
        skillTaught: 'TypeScript Interfaces',
        status: 'COMPLETED',
        durationMinutes: 60,
      });

      const feedWithCompletedSession = await request('/users/dashboard', 'GET', null, tokenA);
      const pendingReviewAction = feedWithCompletedSession.data?.data?.nextBestActions?.find(
        (a) => a.type === 'PENDING_REVIEW'
      );
      assert(pendingReviewAction !== undefined, 'Next best action identifies pending peer review for completed session');
      assert(pendingReviewAction?.priority === 'HIGH', 'Pending peer review is given HIGH priority');

      // Now create the review to satisfy the pending review action
      await Review.create({
        session: pastSession._id,
        reviewer: userAId,
        reviewee: userBId,
        overallRating: 5,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
        feedbackText: 'Outstanding walkthrough of TypeScript interfaces!',
      });

      const feedAfterReview = await request('/users/dashboard', 'GET', null, tokenA);
      const reviewActionAfter = feedAfterReview.data?.data?.nextBestActions?.find(
        (a) => a.type === 'PENDING_REVIEW'
      );
      assert(reviewActionAfter === undefined, 'Pending review action is removed once review is submitted (deduplication)');
    } else {
      console.log('  ⚠️ [SKIP] MongoDB aggregate session test skipped in mock mode');
    }

    // -------------------------------------------------------------
    // TEST 4: Chronological Activity Timeline Sorting & Limits
    // -------------------------------------------------------------
    console.log('\n--- Phase 5: Activity Timeline Verification ---');
    const timelineRes = await request('/users/dashboard', 'GET', null, tokenA);
    const timeline = timelineRes.data?.data?.activityTimeline;
    assert(Array.isArray(timeline), 'Activity timeline is an array');
    assert(timeline.length > 0, 'Activity timeline contains genuine events from created goal');
    assert(timeline.length <= 10, 'Activity timeline is capped at maximum limit of 10 items');

    // Verify timestamps are strictly sorted descending
    let isSorted = true;
    for (let i = 0; i < timeline.length - 1; i++) {
      if (new Date(timeline[i].timestamp) < new Date(timeline[i + 1].timestamp)) {
        isSorted = false;
        break;
      }
    }
    assert(isSorted, 'Activity timeline events are sorted in strict reverse chronological order');

    // -------------------------------------------------------------
    // TEST 5: Notification Preferences Persistence & Enforcement
    // -------------------------------------------------------------
    console.log('\n--- Phase 6: Notification Preferences & Server Enforcement ---');
    // Get default preferences
    const getPrefsRes = await request('/users/notification-preferences', 'GET', null, tokenA);
    assert(getPrefsRes.status === 200, 'GET /api/users/notification-preferences returns 200');
    const prefs = getPrefsRes.data?.data?.preferences;
    assert(prefs?.sessionUpdates === true, 'Default sessionUpdates preference is true');
    assert(prefs?.goalReminders === true, 'Default goalReminders preference is true');
    assert(prefs?.peerActivity === true, 'Default peerActivity preference is true');
    assert(prefs?.circleActivity === true, 'Default circleActivity preference is true');
    assert(prefs?.platformAnnouncements === true, 'Default platformAnnouncements preference is true');

    // Update preferences (opt-out of sessionUpdates)
    const updatePrefsRes = await request(
      '/users/notification-preferences',
      'PUT',
      {
        preferences: {
          sessionUpdates: false,
          platformAnnouncements: false,
        },
      },
      tokenA
    );
    assert(updatePrefsRes.status === 200, 'PUT /api/users/notification-preferences returns 200');
    assert(
      updatePrefsRes.data?.data?.preferences?.sessionUpdates === false,
      'Updated sessionUpdates is persisted as false'
    );
    assert(
      updatePrefsRes.data?.data?.preferences?.goalReminders === true,
      'Non-updated categories maintain existing preference'
    );

    // Verify backend suppression of opted-out category
    if (User.db?.readyState === 1) {
      // Attempt to dispatch a SESSION_SCHEDULED notification to User A
      const suppressedResult = await createFilteredNotification({
        recipientId: userAId,
        type: 'SESSION_SCHEDULED',
        title: 'New Session Scheduled',
        message: 'Your peer has scheduled an exchange session with you.',
      });
      assert(suppressedResult.created === false, 'Notification for opted-out category is not created');
      assert(suppressedResult.suppressed === true, 'Notification is marked as suppressed');

      // Attempt to dispatch a GOAL_REMINDER notification (which is enabled)
      const allowedResult = await createFilteredNotification({
        recipientId: userAId,
        type: 'GOAL_REMINDER',
        title: 'Milestone Check-in',
        message: 'You have 1 milestone remaining in your TypeScript roadmap.',
      });
      assert(allowedResult.created === true, 'Notification for enabled category is created normally');
      assert(allowedResult.notification?._id !== undefined, 'Allowed notification is persisted in database');
    }

    // -------------------------------------------------------------
    // TEST 6: Onboarding Dismissal & Completion Flow
    // -------------------------------------------------------------
    console.log('\n--- Phase 7: Onboarding Dismissal & Completion ---');
    // Dismiss onboarding
    const dismissRes = await request('/users/onboarding/dismiss', 'POST', {}, tokenA);
    assert(dismissRes.status === 200, 'POST /api/users/onboarding/dismiss returns 200');
    assert(
      dismissRes.data?.data?.dismissedOnboardingAt !== null,
      'dismissedOnboardingAt timestamp recorded on backend'
    );

    // Complete onboarding
    const completeRes = await request('/users/onboarding/complete', 'POST', {}, tokenA);
    assert(completeRes.status === 200, 'POST /api/users/onboarding/complete returns 200');
    assert(
      completeRes.data?.data?.user?.onboardingCompletedAt !== null,
      'onboardingCompletedAt timestamp recorded on backend'
    );

    // -------------------------------------------------------------
    // TEST 7: Privacy & Tenant Isolation
    // -------------------------------------------------------------
    console.log('\n--- Phase 8: Privacy & Cross-Tenant Data Isolation ---');
    // User B attempts to access dashboard
    const userBDashboardRes = await request('/users/dashboard', 'GET', null, tokenB);
    assert(userBDashboardRes.status === 200, 'User B retrieves own dashboard');
    const userBFeed = userBDashboardRes.data?.data;
    assert(
      !userBFeed?.nextBestActions?.some((a) => a.title.includes('Master Full-Stack TypeScript Architecture')),
      'User B cannot see User A private goal in their next-best actions'
    );
    assert(
      !userBFeed?.activityTimeline?.some((t) => t.title.includes('Master Full-Stack TypeScript Architecture')),
      'User B activity timeline strictly excludes User A private activities'
    );

    // -------------------------------------------------------------
    // TEST 8: Demo Mode Isolated Sandbox Compatibility
    // -------------------------------------------------------------
    console.log('\n--- Phase 9: Demo Workspace Sandbox & Baseline Verification ---');
    const demoDashboardRes = await request('/users/dashboard', 'GET', null, demoToken);
    assert(demoDashboardRes.status === 200, 'GET /api/users/dashboard succeeds for demo visitor');
    const demoFeed = demoDashboardRes.data?.data;
    assert(demoFeed !== undefined, 'Demo feed structure returned');
    assert(Array.isArray(demoFeed?.nextBestActions), 'Demo visitor receives prioritized next-best actions');
    assert(
      demoFeed?.unfinishedLearning?.title === 'Build an AI-Powered SaaS Blueprint',
      'Demo visitor receives coherent baseline goal continuity'
    );
    assert(
      demoFeed?.unfinishedLearning?.progress === 60,
      'Demo visitor sees accurate baseline progress percentage (60%)'
    );
    assert(
      Array.isArray(demoFeed?.activityTimeline) && demoFeed.activityTimeline.length > 0,
      'Demo visitor receives coherent chronological activity timeline'
    );

    // Demo notification preferences
    const demoPrefsRes = await request('/users/notification-preferences', 'GET', null, demoToken);
    assert(demoPrefsRes.status === 200, 'Demo visitor retrieves notification preferences');

    const demoUpdatePrefsRes = await request(
      '/users/notification-preferences',
      'PUT',
      { preferences: { circleActivity: false } },
      demoToken
    );
    assert(demoUpdatePrefsRes.status === 200, 'Demo visitor updates preferences in isolated workspace');
    assert(
      demoUpdatePrefsRes.data?.data?.preferences?.circleActivity === false,
      'Demo workspace reflects circleActivity: false'
    );

    // Verify real users' preferences are completely untouched by demo mutations
    const realUserPrefsCheck = await request('/users/notification-preferences', 'GET', null, tokenA);
    assert(
      realUserPrefsCheck.data?.data?.preferences?.circleActivity === true,
      'Real user notification preferences remain completely unaffected by demo actions'
    );

    // -------------------------------------------------------------
    // TEST 9: Admin Analytics Compatibility & Demo Exclusion
    // -------------------------------------------------------------
    console.log('\n--- Phase 10: Admin Analytics & Non-Demo Verification ---');
    const adminMetrics = await getAdminOverviewMetrics();
    assert(adminMetrics?.retention !== undefined, 'Admin overview metrics includes retention section');
    assert(
      typeof adminMetrics?.retention?.onboardingCompletedCount === 'number',
      'Admin metrics calculates onboardingCompletedCount'
    );
    assert(
      typeof adminMetrics?.retention?.onboardingCompletionRate === 'number',
      'Admin metrics calculates onboardingCompletionRate'
    );
    assert(
      typeof adminMetrics?.retention?.goalsCreatedCount === 'number',
      'Admin metrics calculates goalsCreatedCount'
    );

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    if (User.db?.readyState === 1) {
      await User.deleteMany({ email: { $in: [userAEmail, userBEmail] } });
      await Goal.deleteMany({ user: { $in: [userAId, userBId] } });
      await Notification.deleteMany({ recipient: { $in: [userAId, userBId] } });
    }

    console.log('\n================================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('💥 Test suite crashed with error:', err);
    process.exit(1);
  }
}

runV35RetentionAndPersonalizationSuite();
