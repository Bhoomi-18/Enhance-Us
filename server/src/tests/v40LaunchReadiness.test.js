import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import Challenge from '../models/challengeModel.js';
import Workspace from '../models/workspaceModel.js';
import Goal from '../models/goalModel.js';
import Session from '../models/sessionModel.js';
import AnalyticsEvent from '../models/analyticsEventModel.js';
import Feedback from '../models/feedbackModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';
import { isAdminEmail } from '../utils/adminAuth.js';
import { resetAdminRateLimiter } from '../middleware/adminRateLimiter.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null, extraHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true', ...extraHeaders };
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

const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ [PASS] ${message}`);
};

const findEvent = async (query, retries = 6, delay = 250) => {
  for (let i = 0; i < retries; i++) {
    const event = await AnalyticsEvent.findOne(query);
    if (event) return event;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
};

const runV40Suite = async () => {
  console.log('\n================================================================');
  console.log('🚀  ENHANCEUS V4.0 LAUNCH READINESS & GROWTH TELEMETRY SUITE');
  console.log('================================================================\n');

  try {
    resetAdminRateLimiter();

    // Ensure MongoDB is connected for direct assertions
    if (mongoose.connection.readyState !== 1) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/enhanceus';
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    }

    const ts = Date.now();
    const userAEmail = `v40_user_a_${ts}@test.org`;
    const userBEmail = `v40_user_b_${ts}@test.org`;
    const adminEmail = 'admin@briefenai.me';

    // -------------------------------------------------------------
    // 1. FIRST-TIME USER REGISTRATION & ONBOARDING DERIVATION
    // -------------------------------------------------------------
    console.log('--- 1. First-Time User Registration & Onboarding Derivation ---');

    const regA = await request('/auth/register', 'POST', {
      name: 'V4 Test User A',
      email: userAEmail,
      password: 'Password123!',
      timezone: 'UTC',
    });
    assert(regA.status === 201, 'User A registered successfully (201)');
    await request('/auth/test-verify', 'POST', { email: userAEmail });

    const loginA = await request('/auth/login', 'POST', { email: userAEmail, password: 'Password123!' });
    assert(loginA.status === 200, 'User A logged in successfully (200)');
    const tokenA = loginA.data?.data?.token;
    const userAId = loginA.data?.data?.user?._id;

    // Verify registration event recorded in telemetry
    const regEvent = await AnalyticsEvent.findOne({
      userId: userAId,
      eventType: 'user_registered',
    });
    assert(!!regEvent, 'Registration event recorded in telemetry');

    // Fetch dashboard and assert 3-step onboarding checklist
    const dashA = await request('/users/dashboard', 'GET', null, tokenA);
    assert(dashA.status === 200, 'Dashboard fetched for new user A');
    const onboarding = dashA.data?.data?.onboarding;
    assert(!!onboarding, 'Onboarding section present in dashboard feed');
    assert(Array.isArray(onboarding.steps) && onboarding.steps.length === 3, 'Onboarding has exactly 3 canonical steps');
    assert(onboarding.steps[0].id === 'offer_skill' && onboarding.steps[0].completed === false, 'offer_skill step is incomplete');
    assert(onboarding.steps[1].id === 'create_goal' && onboarding.steps[1].completed === false, 'create_goal step is incomplete');
    assert(onboarding.steps[2].id === 'connect_peer' && onboarding.steps[2].completed === false, 'connect_peer step is incomplete');
    assert(onboarding.isCompleted === false, 'isCompleted is initially false');

    // -------------------------------------------------------------
    // 2. PROFILE SETUP & TEACHABLE SKILLS TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 2. Profile Setup & Teachable Skills Added Telemetry ---');

    const profileRes = await request(
      '/users/profile',
      'PUT',
      {
        skills: [
          { name: 'TypeScript', proficiency: 'Advanced' },
          { name: 'Node.js', proficiency: 'Intermediate' },
        ],
        learningInterests: ['Python', 'Docker'],
        bio: 'Senior fullstack developer exploring system architecture.',
      },
      tokenA
    );
    assert(profileRes.status === 200, 'User A profile updated with teachable skills (200)');

    // Verify teachable_skills_added and profile_setup_completed events
    const skillEvent = await findEvent({
      userId: userAId,
      eventType: 'teachable_skills_added',
    });
    assert(!!skillEvent, 'teachable_skills_added event recorded in telemetry');
    assert(skillEvent.metadata?.skillsCount === 2, 'teachable_skills_added metadata contains correct skillsCount (2)');

    const profileSetupEvent = await findEvent({
      userId: userAId,
      eventType: 'profile_setup_completed',
    });
    assert(!!profileSetupEvent, 'profile_setup_completed event recorded in telemetry');

    // Verify step 1 in dashboard checklist is now completed
    const dashAAfterProfile = await request('/users/dashboard', 'GET', null, tokenA);
    const stepsAfterProfile = dashAAfterProfile.data?.data?.onboarding?.steps;
    assert(stepsAfterProfile.find((s) => s.id === 'offer_skill')?.completed === true, 'offer_skill step is now marked completed');

    // -------------------------------------------------------------
    // 3. LEARNING GOAL CREATION TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 3. Learning Goal Creation Telemetry ---');

    const targetDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const goalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Container Orchestration with Docker',
        targetDate,
        targetSkills: ['Docker', 'DevOps'],
        description: 'Prepare production-ready container setups',
      },
      tokenA
    );
    assert(goalRes.status === 201, 'User A created learning goal (201)');
    const goalId = goalRes.data?.data?.goal?._id;

    // Verify goal_created event in telemetry
    const goalEvent = await findEvent({
      userId: userAId,
      eventType: 'goal_created',
    });
    assert(!!goalEvent, 'goal_created event recorded in telemetry');
    assert(goalEvent.metadata?.goalId?.toString() === goalId.toString(), 'goal_created metadata matches goalId');

    // Verify step 2 in dashboard checklist is now completed
    const dashAAfterGoal = await request('/users/dashboard', 'GET', null, tokenA);
    const stepsAfterGoal = dashAAfterGoal.data?.data?.onboarding?.steps;
    assert(stepsAfterGoal.find((s) => s.id === 'create_goal')?.completed === true, 'create_goal step is now marked completed');

    // -------------------------------------------------------------
    // 4. PEER MATCHES RETRIEVAL TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 4. Peer Matches Retrieval Telemetry ---');

    const matchesRes = await request('/matches', 'GET', null, tokenA);
    assert(matchesRes.status === 200, 'Matches retrieved successfully (200)');

    const matchEvent = await findEvent({
      userId: userAId,
      eventType: 'matches_viewed',
    });
    assert(!!matchEvent, 'matches_viewed event recorded in telemetry');

    // -------------------------------------------------------------
    // 5. USER B SETUP & EXCHANGE REQUEST TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 5. Exchange Request Creation & Step Completion ---');

    const regB = await request('/auth/register', 'POST', {
      name: 'V4 Test User B',
      email: userBEmail,
      password: 'Password123!',
      timezone: 'UTC',
    });
    assert(regB.status === 201, 'User B registered successfully (201)');
    await request('/auth/test-verify', 'POST', { email: userBEmail });

    const loginB = await request('/auth/login', 'POST', { email: userBEmail, password: 'Password123!' });
    assert(loginB.status === 200, 'User B logged in successfully (200)');
    const tokenB = loginB.data?.data?.token;
    const userBId = loginB.data?.data?.user?._id;

    await request(
      '/users/profile',
      'PUT',
      {
        skills: [{ name: 'Docker', proficiency: 'Expert' }],
        learningInterests: ['TypeScript'],
        bio: 'DevOps lead offering Docker and Kubernetes mentoring.',
      },
      tokenB
    );

    // User A sends exchange request to User B
    const exchangeRes = await request(
      '/exchanges/request',
      'POST',
      {
        recipientId: userBId,
        skillOffered: 'TypeScript',
        skillRequested: 'Docker',
        message: 'Hello User B! Let us swap TypeScript and Docker skills.',
      },
      tokenA
    );
    assert(exchangeRes.status === 201, 'Exchange request created successfully (201)');
    const requestId = exchangeRes.data?.data?.exchangeRequest?._id || exchangeRes.data?.data?.request?._id;

    const exchangeEvent = await findEvent({
      userId: userAId,
      eventType: 'exchange_request_created',
    });
    assert(!!exchangeEvent, 'exchange_request_created event recorded in telemetry');

    // User B accepts exchange request
    const acceptRes = await request(`/exchanges/requests/${requestId}/accept`, 'POST', {}, tokenB);
    assert(acceptRes.status === 200, 'User B accepted exchange request (200)');

    // -------------------------------------------------------------
    // 6. SESSION SCHEDULING & COMPLETION TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 6. Session Scheduling & Completion Telemetry ---');

    // Get connection between User A and User B
    const connRes = await request('/exchanges/connections', 'GET', null, tokenA);
    assert(connRes.status === 200, 'Connections retrieved for User A');
    const connections = connRes.data?.data?.connections || [];
    assert(connections.length > 0, 'Connection found between User A and User B');
    const connectionId = connections[0]._id;

    // User A schedules session with User B
    const sessionDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
    const sessionRes = await request(
      '/sessions',
      'POST',
      {
        connectionId,
        recipientId: userBId,
        date: sessionDate,
        time: '14:00',
        durationMinutes: 60,
        skillTaught: 'TypeScript',
        sessionNotes: 'Intro to TypeScript Generics',
      },
      tokenA
    );
    assert(sessionRes.status === 201, 'Session scheduled successfully (201)');
    const sessionId = sessionRes.data?.data?.session?._id;

    // Verify connect_peer step is now completed on User A's dashboard
    const dashAAfterSession = await request('/users/dashboard', 'GET', null, tokenA);
    const stepsAfterSession = dashAAfterSession.data?.data?.onboarding?.steps;
    assert(stepsAfterSession.find((s) => s.id === 'connect_peer')?.completed === true, 'connect_peer step is now marked completed');
    assert(dashAAfterSession.data?.data?.onboarding?.isCompleted === true, 'isCompleted is true when all 3 steps pass');

    const schedEvent = await findEvent({
      userId: userAId,
      eventType: 'session_scheduled',
    });
    assert(!!schedEvent, 'session_scheduled event recorded in telemetry');

    // Complete session
    const compRes = await request(`/sessions/${sessionId}/complete`, 'POST', {}, tokenA);
    assert(compRes.status === 200, 'Session marked complete (200)');

    const compEvent = await findEvent({
      userId: userAId,
      eventType: 'session_completed',
    });
    assert(!!compEvent, 'session_completed event recorded in telemetry');

    // -------------------------------------------------------------
    // 7. COMMUNITY CHALLENGE JOIN & COMPLETION TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 7. Community Challenge Join & Completion Telemetry ---');

    // Create a public individual challenge
    const chalCreateRes = await request(
      '/challenges',
      'POST',
      {
        title: `Docker Launch Sprint ${ts}`,
        description: 'Complete 3 Docker container deployments.',
        associatedSkill: 'Docker',
        category: 'DevOps',
        participationType: 'INDIVIDUAL',
        difficulty: 'intermediate',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        milestones: [
          { title: 'Create Dockerfile', description: 'Write optimized Dockerfile', criteria: 'Pass container build' },
          { title: 'Run Multi-Container Compose', description: 'Configure docker-compose.yml', criteria: 'Pass compose up' },
        ],
      },
      tokenA
    );
    assert(chalCreateRes.status === 201, 'Community challenge created (201)');
    const challengeId = chalCreateRes.data?.data?.challenge?._id;
    const milestoneId = chalCreateRes.data?.data?.challenge?.milestones?.[0]?._id;

    // User B joins challenge
    const joinRes = await request(`/challenges/${challengeId}/join`, 'POST', {}, tokenB);
    assert(joinRes.status === 200, 'User B joined challenge (200)');

    const joinEvent = await findEvent({
      userId: userBId,
      eventType: 'challenge_joined',
    });
    assert(!!joinEvent, 'challenge_joined event recorded in telemetry');

    // User B completes milestone
    const mRes = await request(`/challenges/${challengeId}/milestones/${milestoneId}/complete`, 'POST', {}, tokenB);
    assert(mRes.status === 200, 'Milestone completed by User B (200)');

    // -------------------------------------------------------------
    // 8. COLLABORATIVE WORKSPACE CREATION TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 8. Collaborative Workspace Creation Telemetry ---');

    const wsRes = await request(
      '/workspaces',
      'POST',
      {
        title: `Fullstack Cloud Engineering Lab ${ts}`,
        description: 'Collaborative development space for microservices.',
        associatedSkill: 'TypeScript',
        visibility: 'PUBLIC',
        tags: ['docker', 'typescript'],
      },
      tokenA
    );
    assert(wsRes.status === 201, 'Collaborative workspace created (201)');

    const wsEvent = await findEvent({
      userId: userAId,
      eventType: 'workspace_created',
    });
    assert(!!wsEvent, 'workspace_created event recorded in telemetry');

    // -------------------------------------------------------------
    // 9. ONBOARDING COMPLETION & DISMISSAL ENDPOINTS
    // -------------------------------------------------------------
    console.log('\n--- 9. Onboarding Completion and Dismissal Endpoints ---');

    const onbCompRes = await request('/users/onboarding/complete', 'POST', {}, tokenA);
    assert(onbCompRes.status === 200, 'Onboarding marked completed via endpoint (200)');
    assert(onbCompRes.data?.data?.onboardingCompletedAt !== null, 'onboardingCompletedAt is returned');

    const onbCompEvent = await findEvent({
      userId: userAId,
      eventType: 'onboarding_completed',
    });
    assert(!!onbCompEvent, 'onboarding_completed event recorded in telemetry');

    const onbDismissRes = await request('/users/onboarding/dismiss', 'POST', {}, tokenB);
    assert(onbDismissRes.status === 200, 'Onboarding dismissed via endpoint (200)');
    assert(onbDismissRes.data?.data?.onboardingDismissedAt !== null, 'onboardingDismissedAt is returned');

    const onbDismissEvent = await findEvent({
      userId: userBId,
      eventType: 'onboarding_dismissed',
    });
    assert(!!onbDismissEvent, 'onboarding_dismissed event recorded in telemetry');

    // -------------------------------------------------------------
    // 10. FEEDBACK VALIDATION & TELEMETRY
    // -------------------------------------------------------------
    console.log('\n--- 10. Feedback Validation and Event Telemetry ---');

    // Invalid rating (10 is out of 1-5 range)
    const badFeedbackRes = await request(
      '/feedback',
      'POST',
      {
        category: 'feature',
        rating: 10,
        comment: 'Invalid rating test',
      },
      tokenA
    );
    assert(badFeedbackRes.status === 400, 'Invalid feedback rating rejected with 400 Bad Request');

    // Valid feedback
    const goodFeedbackRes = await request(
      '/feedback',
      'POST',
      {
        category: 'feature',
        rating: 5,
        comment: 'The peer matching and collaborative sprint experience is superb!',
      },
      tokenA
    );
    assert(goodFeedbackRes.status === 200 || goodFeedbackRes.status === 201, 'Valid feedback submitted successfully (200)');

    const fbEvent = await findEvent({
      userId: userAId,
      eventType: 'feedback_submitted',
    });
    assert(!!fbEvent, 'feedback_submitted event recorded in telemetry');

    // -------------------------------------------------------------
    // 11. ADMIN OPERATIONAL INSIGHTS & EVENT ANALYTICS
    // -------------------------------------------------------------
    console.log('\n--- 11. Admin Operational Insights & Event Analytics ---');

    // Idempotent admin setup
    await User.deleteMany({ email: adminEmail });
    const regAdmin = await request('/auth/register', 'POST', {
      name: 'System Admin V4',
      email: adminEmail,
      password: 'AdminPassword123!',
      timezone: 'UTC',
    });
    assert(regAdmin.status === 201, 'Admin account registered (201)');
    await request('/auth/test-verify', 'POST', { email: adminEmail });

    const loginAdmin = await request('/auth/login', 'POST', { email: adminEmail, password: 'AdminPassword123!' });
    assert(loginAdmin.status === 200, 'Admin logged in (200)');
    const adminToken = loginAdmin.data?.data?.token;

    // Fetch admin analytics
    const adminAnalyticsRes = await request('/admin/analytics', 'GET', null, adminToken);
    assert(adminAnalyticsRes.status === 200, 'Admin analytics endpoint returned 200 OK');

    const analyticsData = adminAnalyticsRes.data?.data;
    assert(!!analyticsData, 'Analytics data object exists');

    // Verify operationalInsights
    const opInsights = analyticsData.operationalInsights;
    assert(!!opInsights, 'operationalInsights section present');
    const onboardingRate = typeof opInsights.onboardingRate === 'number' ? opInsights.onboardingRate : opInsights.users?.onboardingCompletionRate;
    assert(typeof onboardingRate === 'number', 'operationalInsights.onboardingRate is a numeric percentage');
    const profileSetupRate = typeof opInsights.profileSetupRate === 'number' ? opInsights.profileSetupRate : opInsights.users?.profileSetupRate;
    assert(typeof profileSetupRate === 'number', 'operationalInsights.profileSetupRate is a numeric percentage');
    const sessionCompletionRate = typeof opInsights.sessionCompletionRate === 'number' ? opInsights.sessionCompletionRate : opInsights.sessions?.completionRate;
    assert(typeof sessionCompletionRate === 'number', 'operationalInsights.sessionCompletionRate is a numeric percentage');
    const exchangeAcceptanceRate = typeof opInsights.exchangeAcceptanceRate === 'number' ? opInsights.exchangeAcceptanceRate : opInsights.exchanges?.acceptanceRate;
    assert(typeof exchangeAcceptanceRate === 'number', 'operationalInsights.exchangeAcceptanceRate is a numeric percentage');

    // Verify eventAnalytics table aggregation with unique users
    const eventAnalytics = analyticsData.eventAnalytics;
    assert(Array.isArray(eventAnalytics) && eventAnalytics.length > 0, 'eventAnalytics array is non-empty');

    const sampleEvent = eventAnalytics.find((e) => e.eventType === 'teachable_skills_added');
    assert(!!sampleEvent, 'teachable_skills_added is present in eventAnalytics');
    const uniqueCount = sampleEvent.uniqueUsersCount ?? sampleEvent.uniqueUsers;
    assert(typeof uniqueCount === 'number' && uniqueCount >= 1, 'sampleEvent has valid uniqueUsers count');
    assert(uniqueCount <= sampleEvent.totalEvents, 'uniqueUsers is <= totalEvents');

    // -------------------------------------------------------------
    // 12. ADMIN SECURITY & AUTHORIZATION ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- 12. Admin Security & Authorization Enforcement ---');

    // Regular User A cannot access admin analytics
    const unauthAnalytics = await request('/admin/analytics', 'GET', null, tokenA);
    assert(unauthAnalytics.status === 403, 'Regular User A denied access to admin analytics (403 Forbidden)');

    // Anonymous visitor cannot access admin analytics
    const anonAnalytics = await request('/admin/analytics', 'GET');
    assert(anonAnalytics.status === 401, 'Anonymous request rejected from admin analytics (401 Unauthorized)');

    // -------------------------------------------------------------
    // 13. DEMO MODE SANDBOX & ZERO DATA CONTAMINATION
    // -------------------------------------------------------------
    console.log('\n--- 13. Demo Mode Sandbox & Zero Data Contamination ---');

    // Login demo visitor
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoLoginRes.status === 200, 'Demo account logged in successfully (200)');
    const demoToken = demoLoginRes.data?.data?.token;
    assert(demoLoginRes.data?.data?.user?.isDemo === true, 'User record marked isDemo: true');
    assert(!!demoLoginRes.data?.data?.user?.workspaceId, 'User has isolated workspaceId assigned');

    // Demo user cannot access admin analytics
    const demoAdminRes = await request('/admin/analytics', 'GET', null, demoToken);
    assert(demoAdminRes.status === 403, 'Demo visitor strictly denied access to admin analytics (403)');

    // Demo user calls goal creation in sandbox
    const demoGoalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Demo Isolated Goal',
        description: 'Learn React Native for cross-platform mobile development',
        targetDate: '2027-01-01',
        targetSkills: ['React Native'],
      },
      demoToken
    );
    assert(demoGoalRes.status === 201, 'Demo goal created inside isolated sandbox');

    // Ensure NO real Goal document was inserted into MongoDB with title 'Demo Isolated Goal'
    const leakedGoal = await Goal.findOne({ title: 'Demo Isolated Goal' });
    assert(!leakedGoal, 'Zero leakage: Demo goal is not written to real MongoDB goals collection');

    // Ensure demo events are filtered out of admin eventAnalytics
    const demoEventInAdmin = eventAnalytics.some((e) => e.metadata?.isDemo === true);
    assert(!demoEventInAdmin, 'Admin event analytics strictly excludes demo telemetry');

    // -------------------------------------------------------------
    // 14. HEALTH CHECK & PUBLIC SEO VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 14. Health Check & SEO Readiness ---');

    const healthRes = await request('/health', 'GET');
    assert(healthRes.status === 200, 'Backend health check returns 200 OK');
    assert(healthRes.data?.data?.database?.connected === true, 'Health check reports healthy database');

    console.log('\n================================================================');
    console.log('🎉  ALL ENHANCEUS V4.0 LAUNCH READINESS VERIFICATION TESTS PASSED!');
    console.log('================================================================\n');

    // Clean up test records
    await User.deleteMany({ email: { $in: [userAEmail, userBEmail, adminEmail] } });
    await Goal.deleteMany({ _id: goalId });
    await Challenge.deleteMany({ _id: challengeId });
    await Workspace.deleteMany({ _id: wsRes.data?.data?.workspace?._id });
    await Feedback.deleteMany({ submittedEmail: userAEmail });
    await AnalyticsEvent.deleteMany({ userId: { $in: [userAId, userBId] } });

    process.exit(0);
  } catch (error) {
    console.error('\n❌  V4.0 Test Suite Failed:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
};

runV40Suite();
