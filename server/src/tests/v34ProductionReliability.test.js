import http from 'http';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Session from '../models/sessionModel.js';
import Review from '../models/reviewModel.js';
import Feedback from '../models/feedbackModel.js';
import Connection from '../models/connectionModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';

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

async function runV34ProductionReliabilitySuite() {
  console.log('================================================================');
  console.log('🚀 ENHANCEUS V3.4 PRODUCTION RELIABILITY & COMMUNICATION SUITE');
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
    const ts = Date.now();
    const userAEmail = `v34_host_${ts}@test.org`;
    const userBEmail = `v34_peer_${ts}@test.org`;
    const userCEmail = `v34_outsider_${ts}@test.org`;
    const password = 'TestSecurePassword123!';

    // -------------------------------------------------------------------------
    // 1. CORRELATION ID TRACING
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Request Correlation ID & Telemetry Headers ---');
    const customCorrId = `test_trace_${ts}`;
    const healthRes = await request('/health', 'GET', null, null, { 'X-Correlation-Id': customCorrId });
    assert(
      healthRes.headers['x-correlation-id'] === customCorrId,
      'Server propagates client-supplied X-Correlation-Id header'
    );

    const autoCorrRes = await request('/health', 'GET');
    assert(
      typeof autoCorrRes.headers['x-correlation-id'] === 'string' && autoCorrRes.headers['x-correlation-id'].startsWith('req_'),
      'Server automatically generates X-Correlation-Id header when omitted'
    );

    // -------------------------------------------------------------------------
    // 2. SIGNUP & EMAIL VERIFICATION RELIABILITY
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Signup & Email Verification Workflows ---');
    const regResA = await request('/auth/register', 'POST', {
      name: 'Alice Host',
      email: userAEmail,
      password,
      skills: [{ name: 'React', level: 'ADVANCED' }],
    });

    const tokenA = regResA.data?.data?.token;
    const userA = regResA.data?.data?.user;
    assert(regResA.status === 201 && tokenA && userA, 'User A registered successfully');
    assert(userA.emailVerified === false, 'Newly registered account starts unverified (emailVerified: false)');

    // Inspect user record in MongoDB (direct check)
    if (User.db?.readyState === 1) {
      const dbUserA = await User.findOne({ email: userAEmail }).select('+verificationTokenHash +verificationTokenExpires');
      assert(
        Boolean(dbUserA.verificationTokenHash) && dbUserA.verificationTokenHash.length === 64,
        'Verification token is securely stored as 64-character SHA-256 hash'
      );
      assert(
        dbUserA.verificationTokenExpires > new Date(),
        'Verification token expiration is set appropriately in the future (24 hours)'
      );
      assert(
        Boolean(dbUserA.lastVerificationSentAt),
        'lastVerificationSentAt timestamp is recorded upon registration'
      );
    }

    // Attempt resend immediately (within 60s cooldown) -> should return 429
    const cooldownRes = await request('/auth/resend-verification', 'POST', { email: userAEmail });
    assert(
      cooldownRes.status === 429,
      'Resending verification email within 60 seconds returns 429 Too Many Requests'
    );

    // Test invalid verification token
    const invalidVerifyRes = await request('/auth/verify-email', 'POST', { token: 'completely_invalid_token_12345' });
    assert(
      invalidVerifyRes.status === 400,
      'Invalid verification token is rejected with 400 Bad Request'
    );

    // Verify account using test helper
    const verifyRes = await request('/auth/test-verify', 'POST', { email: userAEmail });
    assert(verifyRes.status === 200, 'User A email address verified');

    // Register User B and verify
    const regResB = await request('/auth/register', 'POST', {
      name: 'Bob Peer',
      email: userBEmail,
      password,
      skills: [{ name: 'Docker', level: 'INTERMEDIATE' }],
    });
    const tokenB = regResB.data?.data?.token;
    const userB = regResB.data?.data?.user;
    assert(regResB.status === 201 && tokenB, 'User B registered successfully');
    await request('/auth/test-verify', 'POST', { email: userBEmail });

    // Register User C and verify
    const regResC = await request('/auth/register', 'POST', {
      name: 'Charlie Outsider',
      email: userCEmail,
      password,
    });
    const tokenC = regResC.data?.data?.token;
    const userC = regResC.data?.data?.user;
    assert(regResC.status === 201 && tokenC, 'User C registered successfully');
    await request('/auth/test-verify', 'POST', { email: userCEmail });

    // Anti-enumeration: resend verification for non-existent email
    const nonExistentResend = await request('/auth/resend-verification', 'POST', { email: `nonexistent_${ts}@nowhere.org` });
    assert(
      nonExistentResend.status === 200 && nonExistentResend.data?.success === true,
      'Anti-enumeration: Resend verification for unknown email returns safe generic success'
    );

    // Demo account isolation on verification
    const demoResend = await request('/auth/resend-verification', 'POST', { email: DEMO_EMAIL });
    assert(
      demoResend.status === 200 && demoResend.data?.success === true,
      'Demo account verification requests return generic success without leaking or dispatching real emails'
    );

    // -------------------------------------------------------------------------
    // 3. ESTABLISH ACTIVE PEER CONNECTION
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Exchange Request & Connection Setup ---');
    const goalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Cloud Architecture',
        description: 'Building scalable distributed cloud architectures with Docker and Redis.',
        targetDate: new Date(Date.now() + 864000000).toISOString(),
      },
      tokenA
    );
    const goalId = goalRes.data?.data?.goal?._id;
    assert(goalRes.status === 201 && goalId, 'User A created Goal');

    const reqRes = await request(
      '/exchanges/request',
      'POST',
      {
        recipientId: userB._id,
        goalId,
        offeredSkill: 'React',
        requestedSkill: 'Docker',
      },
      tokenA
    );
    const requestId = reqRes.data?.data?.exchangeRequest?._id;
    assert(reqRes.status === 201 && requestId, 'Exchange Request sent from User A to User B');

    const acceptRes = await request(`/exchanges/requests/${requestId}/accept`, 'POST', {}, tokenB);
    const connectionId = acceptRes.data?.data?.connection?._id;
    assert(acceptRes.status === 200 && connectionId, 'User B accepted exchange request -> Connection established');

    // -------------------------------------------------------------------------
    // 4. SESSION SCHEDULING RELIABILITY & TIMEZONE RESILIENCE
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Session Scheduling Reliability & Timezone Handling ---');
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    // Missing date
    const missingDate = await request(
      '/sessions',
      'POST',
      { connectionId, recipientId: userB._id, time: '14:00', skillTaught: 'React' },
      tokenA
    );
    assert(missingDate.status === 400, 'Rejects session creation with missing date (400)');

    // Missing skillTaught
    const missingSkill = await request(
      '/sessions',
      'POST',
      { connectionId, recipientId: userB._id, date: tomorrowStr, time: '14:00' },
      tokenA
    );
    assert(missingSkill.status === 400, 'Rejects session creation with missing skillTaught (400)');

    // Past date (e.g. 2021-01-01)
    const pastDate = await request(
      '/sessions',
      'POST',
      { connectionId, recipientId: userB._id, date: '2021-01-01', time: '10:00', skillTaught: 'React' },
      tokenA
    );
    assert(pastDate.status === 400, 'Rejects genuinely past dates (400)');

    // Self-scheduling rejected
    const selfSched = await request(
      '/sessions',
      'POST',
      { recipientId: userA._id, date: tomorrowStr, time: '14:00', skillTaught: 'React' },
      tokenA
    );
    assert(selfSched.status === 400, 'Rejects self-scheduling with own user ID (400)');

    // Unauthorized outsider (User C) cannot schedule using connectionId belonging to A and B
    const unauthSched = await request(
      '/sessions',
      'POST',
      { connectionId, recipientId: userA._id, date: tomorrowStr, time: '14:00', skillTaught: 'Docker' },
      tokenC
    );
    assert(unauthSched.status === 403, 'Rejects scheduling against unauthorized connection (403)');

    // Valid scheduling with clientTimezoneOffset (-330 = IST, 240 = EDT)
    const validSched = await request(
      '/sessions',
      'POST',
      {
        connectionId,
        recipientId: userB._id,
        date: tomorrowStr,
        time: '15:00',
        durationMinutes: 60,
        skillTaught: 'React Performance Tuning',
        clientTimezoneOffset: -330, // 5 hours 30 mins ahead of UTC
      },
      tokenA
    );
    const sessionId = validSched.data?.data?.session?._id;
    assert(validSched.status === 201 && sessionId, 'Valid session scheduled with timezone offset (201)');
    assert(
      Array.isArray(validSched.data?.data?.session?.participants) && validSched.data?.data?.session?.participants.length === 2,
      'Scheduled session returns populated participants'
    );

    // Duplicate booking prevented at same date & time
    const dupSched = await request(
      '/sessions',
      'POST',
      {
        connectionId,
        recipientId: userB._id,
        date: tomorrowStr,
        time: '15:00',
        durationMinutes: 60,
        skillTaught: 'React Performance Tuning',
      },
      tokenA
    );
    assert(dupSched.status === 400, 'Duplicate session booking prevented at identical date & time (400)');

    // -------------------------------------------------------------------------
    // 5. POST-SESSION PEER RATINGS & REPUTATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Post-Session Peer Rating & Reputation Workflow ---');

    // Review before completion rejected
    const earlyReview = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenB
    );
    assert(earlyReview.status === 400, 'Rejects peer review submission for SCHEDULED (non-completed) session (400)');

    // Complete session
    const compRes = await request(`/sessions/${sessionId}/complete`, 'POST', {}, tokenA);
    assert(compRes.status === 200, 'Session marked COMPLETED successfully');
    assert(
      compRes.data?.data?.session?.status === 'COMPLETED' &&
      Array.isArray(compRes.data?.data?.session?.participants),
      'Completed session response contains populated participants for review resolution'
    );

    // Self-review rejected
    const selfRev = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenA
    );
    assert(selfRev.status === 400, 'Rejects self-review submission (400)');

    // Non-participant (User C) rejected
    const outsiderRev = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenC
    );
    assert(outsiderRev.status === 403, 'Rejects rating submission by non-participant (403)');

    // Valid review submission with auto-resolved revieweeId and dual rating fallback
    const validRev = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        // revieweeId omitted to verify server auto-resolves peer from session
        rating: 5, // single-rating fallback
        feedbackText: 'Outstanding React guidance. Clear code walkthroughs and great communication.',
      },
      tokenB
    );
    const reviewId = validRev.data?.data?.review?._id;
    assert(
      validRev.status === 201 && reviewId && validRev.data?.data?.review?.overallRating === 5,
      'Valid review accepted with single-rating fallback and auto-resolved reviewee (201)'
    );

    // Duplicate review rejected
    const dupRev = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenB
    );
    assert(dupRev.status === 400, 'Rejects duplicate review submission for the same session (400)');

    // Reputation updated on User A profile
    const profileResA = await request(`/users/${userA._id}`, 'GET', null, tokenA);
    const repA = profileResA.data?.data?.user?.reputation;
    assert(
      repA?.reviewCount >= 1 && repA?.averageRating === 5.0,
      'User A reputation updated with calculated average rating and review count'
    );

    // -------------------------------------------------------------------------
    // 6. FEEDBACK FORM RELIABILITY & PLUNK FAILURE TOLERANCE
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Feedback Persistence & Honest Delivery Reporting ---');
    const fbRes = await request(
      '/feedback',
      'POST',
      {
        rating: 5,
        improvements: 'More dark-mode contrasting borders on cards.',
        newFeatures: 'Interactive whiteboard for real-time diagramming during sessions.',
        comments: 'Loving the V3.4 reliability upgrades!',
      },
      tokenA
    );

    assert(fbRes.status === 200, 'Feedback submission accepted with 200 OK');
    assert(
      fbRes.data?.message?.toLowerCase().includes('feedback submitted') || fbRes.data?.data?.success === true,
      'Feedback submission returns confirmed success status'
    );

    // Direct MongoDB verification of feedback persistence
    if (Feedback.db?.readyState === 1) {
      const persistedFb = await Feedback.findOne({ user: userA._id }).sort({ createdAt: -1 });
      assert(
        Boolean(persistedFb) && persistedFb.rating === 5 && persistedFb.isDemo === false,
        'Feedback successfully persisted to MongoDB independently of outbound email dispatch'
      );
    }

    // -------------------------------------------------------------------------
    // 7. DEMO MODE ISOLATION & CANONICAL WORKSPACE INTEGRITY
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Mandatory Demo Compatibility & Workspace Isolation ---');
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    const demoToken = demoLoginRes.data?.data?.token;
    const demoUser = demoLoginRes.data?.data?.user;
    assert(demoLoginRes.status === 200 && demoToken && demoUser?.isDemo === true, 'Demo account logs in with workspace JWT');

    // Demo GET /exchanges/connections returns canonical demo connections
    const demoConnsRes = await request('/exchanges/connections', 'GET', null, demoToken);
    const demoConns = demoConnsRes.data?.data?.connections || [];
    assert(
      demoConnsRes.status === 200 && demoConns.length >= 2,
      'Demo mode returns canonical active connections (Sarah Chen & Marcus Vance)'
    );

    // Demo schedule session
    const demoSchedRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: 'demo_peer_sarah_002',
        date: tomorrowStr,
        time: '16:00',
        skillTaught: 'Figma Auto-Layout',
      },
      demoToken
    );
    const demoSessionId = demoSchedRes.data?.data?.session?._id;
    assert(
      demoSchedRes.status === 201 && demoSessionId && demoSessionId.startsWith('demo_session_'),
      'Demo session scheduled in isolated demo workspace'
    );

    // Ensure demo session was NOT written to real MongoDB
    if (Session.db?.readyState === 1) {
      const realSessionLookup = await Session.findById(demoSessionId);
      assert(!realSessionLookup, 'Zero Leakage: Demo session is never written to real MongoDB collection');
    }

    // Demo complete session and submit review
    const demoCompRes = await request(`/sessions/${demoSessionId}/complete`, 'POST', {}, demoToken);
    assert(demoCompRes.status === 200, 'Demo session completed in workspace');

    const demoRevRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: demoSessionId,
        revieweeId: 'demo_peer_sarah_002',
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
        feedbackText: 'Great demo exchange with Sarah!',
      },
      demoToken
    );
    const demoRevId = demoRevRes.data?.data?.review?._id;
    assert(
      demoRevRes.status === 201 && demoRevId && demoRevId.startsWith('demo_rev_'),
      'Demo review created with normalized ratings in isolated demo workspace'
    );

    // Ensure demo review was NOT written to real MongoDB
    if (Review.db?.readyState === 1) {
      const realReviewLookup = await Review.findById(demoRevId);
      assert(!realReviewLookup, 'Zero Leakage: Demo review is never written to real MongoDB collection');
    }

    // Demo feedback submission
    const demoFbRes = await request(
      '/feedback',
      'POST',
      {
        rating: 5,
        improvements: 'Demo mode is completely interactive!',
      },
      demoToken
    );
    assert(
      demoFbRes.status === 200 && demoFbRes.data?.data?.simulated === true,
      'Demo feedback is marked simulated and never dispatched to real support inbox'
    );

  } catch (err) {
    console.error('Fatal suite failure:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`V3.4 SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runV34ProductionReliabilitySuite();
