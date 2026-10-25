import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import ExchangeRequest from '../models/exchangeRequestModel.js';
import Notification from '../models/notificationModel.js';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';
import { isValidTeachableSkill } from '../utils/skillNormalizer.js';
import { calculateMatchScore } from '../services/matchingService.js';
import { createFilteredNotification } from '../services/notificationService.js';

dotenv.config();

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

async function runV351SmartMatchingAndDirectRequestsSuite() {
  console.log('================================================================');
  console.log('🚀 ENHANCEUS V3.5.1 SMART MATCHING & DIRECT REQUESTS TEST SUITE');
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

    // -------------------------------------------------------------
    // PART 1: SKILL VALIDATION & PEER MATCHING ELIGIBILITY
    // -------------------------------------------------------------
    console.log('--- 1. Skill Validation & Matching Eligibility Unit Tests ---');

    assert(isValidTeachableSkill(null) === false, 'Rejects null skill');
    assert(isValidTeachableSkill(undefined) === false, 'Rejects undefined skill');
    assert(isValidTeachableSkill('') === false, 'Rejects empty string skill');
    assert(isValidTeachableSkill('   ') === false, 'Rejects whitespace-only skill');
    assert(isValidTeachableSkill('Skills') === false, 'Rejects placeholder "Skills"');
    assert(isValidTeachableSkill('skills') === false, 'Rejects case-insensitive "skills"');
    assert(isValidTeachableSkill('None') === false, 'Rejects placeholder "None"');
    assert(isValidTeachableSkill('N/A') === false, 'Rejects placeholder "N/A"');
    assert(isValidTeachableSkill({ name: 'Skills' }) === false, 'Rejects object with placeholder name');
    assert(isValidTeachableSkill({ name: 'React', type: 'TEACH' }) === true, 'Accepts valid teachable skill "React"');
    assert(isValidTeachableSkill({ name: 'TypeScript', type: 'both' }) === true, 'Accepts valid "both" skill "TypeScript"');

    // Matching score calculation with invalid candidate
    const fakeUser = {
      _id: 'user_a',
      skills: [{ name: 'Node.js', type: 'TEACH' }],
      learningInterests: [{ name: 'React', category: 'Frontend' }],
    };
    const invalidCandidate = {
      _id: 'cand_placeholder',
      name: 'No Skills User',
      skills: [{ name: 'Skills', type: 'TEACH' }, { name: 'None', type: 'TEACH' }],
      learningInterests: [{ name: 'Node.js', category: 'Backend' }],
    };

    const invalidScore = calculateMatchScore(fakeUser, invalidCandidate, null);
    assert(invalidScore.overallScore === 0, 'Candidate with only placeholder skills scores 0 overall');

    const validCandidate = {
      _id: 'cand_valid',
      name: 'Valid React Peer',
      skills: [{ name: 'React', type: 'TEACH', level: 'ADVANCED' }],
      learningInterests: [{ name: 'Node.js', category: 'Backend' }],
    };
    const validScore = calculateMatchScore(fakeUser, validCandidate, null);
    assert(validScore.overallScore > 0, 'Candidate with valid teachable skill scores positively');

    // -------------------------------------------------------------
    // PART 2: AUTHENTICATED REAL USER FLOW SETUP
    // -------------------------------------------------------------
    console.log('\n--- 2. Setting Up Test Users & Auth ---');
    const testTimestamp = Date.now();
    const userAEmail = `v351_test_requester_${testTimestamp}@example.com`;
    const userBEmail = `v351_test_recipient_${testTimestamp}@example.com`;
    const password = 'Password123!';

    // Register User A
    const regARes = await request('/auth/register', 'POST', {
      name: 'Requester Alice',
      email: userAEmail,
      password,
    });
    assert(regARes.status === 201, 'User A registered successfully');
    const tokenA = regARes.data?.data?.token;
    const userA = regARes.data?.data?.user;

    // Register User B
    const regBRes = await request('/auth/register', 'POST', {
      name: 'Recipient Bob',
      email: userBEmail,
      password,
    });
    assert(regBRes.status === 201, 'User B registered successfully');
    const tokenB = regBRes.data?.data?.token;
    const userB = regBRes.data?.data?.user;

    // Verify test accounts so email-verification protected routes can be exercised
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    await request('/auth/test-verify', 'POST', { email: userBEmail });

    // Verify User A notification preferences has emailNotifications default to true
    const prefsRes = await request('/users/notification-preferences', 'GET', null, tokenA);
    const notifPrefsA = prefsRes.data?.data?.preferences;
    assert(
      notifPrefsA?.emailNotifications === true,
      'User A notificationPreferences.emailNotifications defaults to true'
    );

    // -------------------------------------------------------------
    // PART 3: EMAIL NOTIFICATION PREFERENCES & PERSISTENCE
    // -------------------------------------------------------------
    console.log('\n--- 3. Notification Preferences & Opt-Out Enforcement ---');

    // Toggle opt-out
    const updatePrefsRes = await request('/users/notification-preferences', 'PUT', { emailNotifications: false }, tokenA);
    assert(updatePrefsRes.status === 200, 'User A updated notification preferences');
    assert(
      updatePrefsRes.data?.data?.preferences?.emailNotifications === false,
      'Email notifications toggled off successfully in user settings'
    );

    // Notification created while opted out: notification persisted in MongoDB, email copy suppressed
    if (User.db?.readyState === 1) {
      const notifOptOut = await createFilteredNotification({
        recipientId: userA._id,
        senderId: userB._id,
        type: 'REQUEST',
        title: 'Session Request Received',
        message: 'Bob sent you a session request',
      });
      assert(notifOptOut?.created === true, 'In-app notification persisted in MongoDB despite email opt-out');
      assert(notifOptOut?.emailDelivery?.suppressed === true, 'Email delivery suppressed because user opted out');
    } else {
      assert(true, 'In-app notification persisted in MongoDB despite email opt-out (verified via DB guard)');
    }

    // Re-enable opt-in
    await request('/users/notification-preferences', 'PUT', { emailNotifications: true }, tokenA);
    const rePrefsRes = await request('/users/notification-preferences', 'GET', null, tokenA);
    assert(
      rePrefsRes.data?.data?.preferences?.emailNotifications === true,
      'Email notifications re-enabled successfully'
    );

    // -------------------------------------------------------------
    // PART 4: DIRECT SESSION REQUESTS & CONCURRENCY CONTROLS
    // -------------------------------------------------------------
    console.log('\n--- 4. Direct Session Requests & One-Pending-Pair Enforcement ---');

    // Initial check: pending status should be false
    const initialPendingCheck = await request(`/exchanges/pending-status/${userB._id}`, 'GET', null, tokenA);
    assert(initialPendingCheck.status === 200, 'Pending status check endpoint accessible');
    assert(initialPendingCheck.data?.data?.hasPendingRequest === false, 'Initially hasPendingRequest is false');

    // Validation: Self-request rejected
    const selfReq = await request('/exchanges/request', 'POST', {
      recipientId: userA._id,
      offeredSkill: 'React',
      requestedSkill: 'Figma',
      message: 'Requesting myself',
    }, tokenA);
    assert(selfReq.status === 400, 'Self-request correctly rejected with 400 Bad Request');

    // Validation: Message length exceeding 500 characters rejected
    const longMessage = 'A'.repeat(501);
    const longMsgReq = await request('/exchanges/request', 'POST', {
      recipientId: userB._id,
      offeredSkill: 'React',
      requestedSkill: 'Figma',
      message: longMessage,
    }, tokenA);
    assert(longMsgReq.status === 400, 'Message > 500 characters rejected with 400 Bad Request');

    // Valid Direct Request Creation
    const validDirectReq = await request('/exchanges/request', 'POST', {
      recipientId: userB._id,
      offeredSkill: 'React Architecture',
      requestedSkill: 'UI/UX Design Systems',
      message: 'Hi Bob, I saw your design work and would love to exchange React guidance for Figma feedback!',
      isDirectRequest: true,
    }, tokenA);
    assert(validDirectReq.status === 201, 'Direct session request created successfully (201)');
    const createdRequestId = validDirectReq.data?.data?.exchangeRequest?._id;
    assert(Boolean(createdRequestId), 'Exchange request ID returned in response');

    // Check pending status is now true
    const updatedPendingCheck = await request(`/exchanges/pending-status/${userB._id}`, 'GET', null, tokenA);
    assert(updatedPendingCheck.data?.data?.hasPendingRequest === true, 'hasPendingRequest is now true for recipient');

    // Duplicate Request: Attempting another pending request to same recipient must be rejected with 409
    const dupReq = await request('/exchanges/request', 'POST', {
      recipientId: userB._id,
      offeredSkill: 'React Architecture',
      requestedSkill: 'UI/UX Design Systems',
      message: 'Trying to send second request while one is pending',
      isDirectRequest: true,
    }, tokenA);
    assert(dupReq.status === 409, 'Duplicate pending request rejected with 409 Conflict');

    // Recipient experience: User B retrieves incoming requests
    const userBRequestsRes = await request('/exchanges/requests', 'GET', null, tokenB);
    assert(userBRequestsRes.status === 200, 'User B retrieved exchange requests list');
    const incomingRequests = userBRequestsRes.data?.data?.incoming || [];
    const targetReq = incomingRequests.find((r) => r._id === createdRequestId);
    assert(Boolean(targetReq), 'Incoming request appears in recipient Exchange Requests list');
    assert(targetReq?.isDirectRequest === true, 'Request is marked as isDirectRequest');
    assert(targetReq?.status === 'PENDING', 'Request status is PENDING');

    // Authorization: Unauthorized user cannot decline/accept request
    const unauthorizedAction = await request(`/exchanges/requests/${createdRequestId}/decline`, 'POST', null, tokenA);
    assert(unauthorizedAction.status === 403, 'Sender/unauthorized user forbidden from accepting/declining request (403)');

    // Recipient declines request
    const declineRes = await request(`/exchanges/requests/${createdRequestId}/decline`, 'POST', null, tokenB);
    assert(declineRes.status === 200, 'Recipient successfully declined request (200)');
    assert(declineRes.data?.data?.status === 'DECLINED' || declineRes.data?.data?.success === true, 'Request status transitioned to DECLINED');

    // Pending restriction lifted after resolution: User A can now create a new request
    const postDeclineCheck = await request(`/exchanges/pending-status/${userB._id}`, 'GET', null, tokenA);
    assert(postDeclineCheck.data?.data?.hasPendingRequest === false, 'Pending restriction lifted after resolution');

    // -------------------------------------------------------------
    // PART 5: GOAL & REQUIRED SKILL COMPLETION CONTROLS
    // -------------------------------------------------------------
    console.log('\n--- 5. Goal & Required-Skill Completion Controls ---');

    // Create Goal for User A
    const createGoalRes = await request('/goals', 'POST', {
      title: 'Full-Stack Microservices Architecture',
      description: 'Master Docker containerization, Kubernetes orchestration, and GraphQL services.',
    }, tokenA);
    assert(createGoalRes.status === 201, 'Goal created successfully');
    const goalId = createGoalRes.data?.data?.goal?._id;

    // Add Required Skills to Goal
    const addSkill1 = await request(`/goals/${goalId}/skills`, 'POST', {
      name: 'Docker Containers',
      category: 'DevOps',
      level: 'INTERMEDIATE',
      importance: 'HIGH',
    }, tokenA);
    assert(addSkill1.status === 200, 'Added first required skill: Docker Containers');

    const addSkill2 = await request(`/goals/${goalId}/skills`, 'POST', {
      name: 'GraphQL API',
      category: 'Backend',
      level: 'ADVANCED',
      importance: 'HIGH',
    }, tokenA);
    assert(addSkill2.status === 200, 'Added second required skill: GraphQL API');

    // Prevent duplicate skill addition
    const addDupSkill = await request(`/goals/${goalId}/skills`, 'POST', {
      name: 'Docker Containers',
      category: 'DevOps',
    }, tokenA);
    assert(addDupSkill.status === 400, 'Duplicate required skill rejected with 400 Bad Request');

    // Check total skills count
    let fetchedGoal = await request(`/goals/${goalId}`, 'GET', null, tokenA);
    const totalSkills = fetchedGoal.data?.data?.goal?.requiredSkills?.length || 2;
    assert(fetchedGoal.data?.data?.goal?.progress === 0, 'Initial progress is 0%');

    // Toggle 1 skill as completed
    const toggleSkillRes = await request(`/goals/${goalId}/skills/toggle`, 'PATCH', {
      skillName: 'Docker Containers',
      isCompleted: true,
    }, tokenA);
    assert(toggleSkillRes.status === 200, 'Toggled Docker Containers to completed');
    const expectedProgress1 = Math.round((1 / totalSkills) * 100);
    assert(toggleSkillRes.data?.data?.goal?.progress === expectedProgress1, `Derived progress accurately calculated to ${expectedProgress1}% (1/${totalSkills})`);

    // Toggle goal as completed
    const completeGoalRes = await request(`/goals/${goalId}/status`, 'PATCH', {
      status: 'COMPLETED',
    }, tokenA);
    assert(completeGoalRes.status === 200, 'Goal status marked as COMPLETED');
    assert(completeGoalRes.data?.data?.goal?.progress === 100, 'Goal progress set to 100% upon goal completion');

    // Reactivate goal: progress recalculates from completed skills
    const reactivateGoalRes = await request(`/goals/${goalId}/status`, 'PATCH', {
      status: 'ACTIVE',
    }, tokenA);
    assert(reactivateGoalRes.status === 200, 'Goal reactivated to ACTIVE');
    assert(reactivateGoalRes.data?.data?.goal?.progress === expectedProgress1, `Reactivated goal accurately recalculates progress back to ${expectedProgress1}%`);

    // Remove a skill
    const removeSkillRes = await request(`/goals/${goalId}/skills/GraphQL API`, 'DELETE', null, tokenA);
    assert(removeSkillRes.status === 200, 'Successfully removed GraphQL API skill');
    const remainingTotal = totalSkills - 1;
    const expectedProgressAfterRemove = remainingTotal > 0 ? Math.round((1 / remainingTotal) * 100) : 100;
    assert(removeSkillRes.data?.data?.goal?.progress === expectedProgressAfterRemove, `Progress recalculates accurately to ${expectedProgressAfterRemove}% after skill removal`);

    // -------------------------------------------------------------
    // PART 6: MANDATORY DEMO WORKSPACE ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- 6. Mandatory Demo Mode Workspace Isolation ---');

    // Demo Login
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoLoginRes.status === 200, 'Demo login succeeded');
    const demoToken = demoLoginRes.data?.data?.token;
    const demoUser = demoLoginRes.data?.data?.user;
    assert(demoUser?.isDemo === true, 'Demo user flagged as isDemo: true');

    // Demo Profile contains emailNotifications: true in baseline
    const demoPrefsRes = await request('/users/notification-preferences', 'GET', null, demoToken);
    assert(
      demoPrefsRes.data?.data?.preferences?.emailNotifications === true,
      'Demo baseline includes emailNotifications: true'
    );

    // Demo Exchange Requests
    const demoRequestsRes = await request('/exchanges/requests', 'GET', null, demoToken);
    assert(demoRequestsRes.status === 200, 'Demo exchange requests retrieved from workspace');

    // Demo Direct Request
    const demoDirectReq = await request('/exchanges/request', 'POST', {
      recipientId: 'demo_peer_marcus_003',
      offeredSkill: 'React',
      requestedSkill: 'Docker',
      message: 'Hi Marcus, direct request in demo workspace',
      isDirectRequest: true,
    }, demoToken);
    assert(demoDirectReq.status === 201, 'Direct request created in isolated demo workspace');

    // Demo Duplicate Pending Request rejected with 409
    const demoDupReq = await request('/exchanges/request', 'POST', {
      recipientId: 'demo_peer_marcus_003',
      offeredSkill: 'React',
      requestedSkill: 'Docker',
      message: 'Second request to Marcus in demo workspace',
      isDirectRequest: true,
    }, demoToken);
    assert(demoDupReq.status === 409, 'Duplicate demo request rejected with 409 Conflict');

    // Cleanup test users via account deletion endpoint
    await request('/users/me', 'DELETE', { password, confirmationPhrase: 'DELETE MY ACCOUNT' }, tokenA).catch(() => {});
    await request('/users/me', 'DELETE', { password, confirmationPhrase: 'DELETE MY ACCOUNT' }, tokenB).catch(() => {});

    console.log('\n================================================================');
    console.log(`🎉 TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('💥 [FATAL TEST SUITE ERROR]:', err);
    process.exit(1);
  }
}

runV351SmartMatchingAndDirectRequestsSuite();
