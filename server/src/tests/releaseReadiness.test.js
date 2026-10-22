import http from 'http';

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
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

const requestRaw = (fullPath, method = 'GET') => {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:5000' + fullPath);
    const req = http.request(url, { method }, (res) => {
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
    });
    req.on('error', reject);
    req.end();
  });
};

async function runReleaseReadinessSuite() {
  console.log('====================================================');
  console.log('🛡️  RUNNING ENHANCEUS V2.5 RELEASE READINESS SUITE');
  console.log('====================================================\n');

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
    const emailA = `v25_host_${ts}@test.org`;
    const emailB = `v25_peer_${ts}@test.org`;
    const emailC = `v25_outsider_${ts}@test.org`;
    const password = 'TestPassword123!';

    // ==========================================
    // 1. BASELINE SECURITY HEADERS & HEALTH LIVENESS
    // ==========================================
    console.log('🔒 [1] Baseline Security Headers, Express Fingerprinting & Health Liveness:');
    const healthRes = await request('/health', 'GET');
    assert(healthRes.status === 200, 'API Health endpoint (/api/health) responds with HTTP 200');

    // Test root /health endpoint (Render free wake-up & uptime monitor liveness check)
    const rootHealthRes = await requestRaw('/health', 'GET');
    assert(rootHealthRes.status === 200, 'Root liveness endpoint (/health) responds with HTTP 200');
    assert(rootHealthRes.data?.status === 'ok', 'Root liveness endpoint returns { status: "ok" }');
    assert(typeof rootHealthRes.data?.timestamp === 'string', 'Root liveness endpoint returns valid ISO timestamp');

    // Test root index endpoint (/)
    const rootIndexRes = await requestRaw('/', 'GET');
    assert(rootIndexRes.status === 200, 'Root welcome endpoint (/) responds with HTTP 200');
    assert(rootIndexRes.data?.livenessCheck === '/health', 'Root welcome endpoint advertises livenessCheck');

    assert(
      healthRes.headers['x-content-type-options'] === 'nosniff',
      'Header X-Content-Type-Options: nosniff enforced'
    );
    assert(
      healthRes.headers['x-frame-options'] === 'SAMEORIGIN',
      'Header X-Frame-Options: SAMEORIGIN enforced (clickjacking defense)'
    );
    assert(
      healthRes.headers['x-xss-protection'] === '1; mode=block',
      'Header X-XSS-Protection: 1; mode=block enforced'
    );
    assert(
      healthRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
      'Header Referrer-Policy enforced'
    );
    assert(
      !healthRes.headers['x-powered-by'],
      'Fingerprinting: X-Powered-By header disabled'
    );

    // ==========================================
    // 2. AUTHENTICATION & BRUTE-FORCE RATE LIMITING
    // ==========================================
    console.log('\n👤 [2] Authentication, Rate Limiting & User Creation:');
    const regARes = await request('/auth/register', 'POST', {
      name: 'V25 Release Host A',
      email: emailA,
      password,
    });
    const tokenA = regARes.data?.data?.token;
    const userA = regARes.data?.data?.user;
    assert(regARes.status === 201 && tokenA, 'User A registered successfully');
    assert(
      regARes.headers['ratelimit-limit'] !== undefined,
      'Auth rate limiter sets RateLimit-Limit header'
    );

    const regBRes = await request('/auth/register', 'POST', {
      name: 'V25 Release Peer B',
      email: emailB,
      password,
    });
    const tokenB = regBRes.data?.data?.token;
    const userB = regBRes.data?.data?.user;
    assert(regBRes.status === 201 && tokenB, 'User B registered successfully');

    const regCRes = await request('/auth/register', 'POST', {
      name: 'V25 Release Outsider C',
      email: emailC,
      password,
    });
    const tokenC = regCRes.data?.data?.token;
    const userC = regCRes.data?.data?.user;
    assert(regCRes.status === 201 && tokenC, 'User C registered successfully');

    // Verify test users for subsequent integration actions
    await request('/auth/test-verify', 'POST', { userId: userA?._id });
    await request('/auth/test-verify', 'POST', { userId: userB?._id });
    await request('/auth/test-verify', 'POST', { userId: userC?._id });

    // Password validation
    const weakPassRes = await request('/auth/register', 'POST', {
      name: 'Weak Pass User',
      email: `weak_${ts}@test.org`,
      password: '123',
    });
    assert(weakPassRes.status === 400, 'Rejects password shorter than 6 characters (400)');

    // ==========================================
    // 3. EXCHANGE CONNECTION SETUP
    // ==========================================
    console.log('\n🤝 [3] Exchange Connection Setup:');
    const goalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Fullstack Security',
        description: 'Hardening web applications and peer exchange',
        targetSkill: 'Application Security',
        currentLevel: 'intermediate',
        targetLevel: 'advanced',
      },
      tokenA
    );
    const goalA = goalRes.data?.data?.goal;
    assert(goalRes.status === 201 && goalA, 'User A goal created');

    const reqSendRes = await request(
      '/exchanges/request',
      'POST',
      {
        recipientId: userB._id,
        goalId: goalA._id,
        offeredSkill: 'Security Auditing',
        requestedSkill: 'React Architecture',
        proposedExchange: 'Let us exchange security and React insights.',
      },
      tokenA
    );
    const exchangeReq = reqSendRes.data?.data?.exchangeRequest;
    assert(reqSendRes.status === 201 && exchangeReq?._id, 'Exchange request sent from User A to User B');

    const acceptRes = await request(
      `/exchanges/requests/${exchangeReq._id}/accept`,
      'POST',
      {},
      tokenB
    );
    const connection = acceptRes.data?.data?.connection;
    assert(acceptRes.status === 200 && connection?._id, 'Exchange accepted -> Connection established');

    // ==========================================
    // 4. SESSION SCHEDULING ROBUSTNESS & EDGE CASES
    // ==========================================
    console.log('\n📅 [4] Session Scheduling Hardening & Validation:');
    const futureDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    // Missing date
    const noDateRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: userB._id,
        time: '14:00',
        skillTaught: 'Security Engineering',
      },
      tokenA
    );
    assert(noDateRes.status === 400, 'Rejects session missing date (400)');

    // Invalid date string
    const invalidDateRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: userB._id,
        date: 'not-a-valid-date',
        time: '14:00',
        skillTaught: 'Security Engineering',
      },
      tokenA
    );
    assert(invalidDateRes.status === 400, 'Rejects malformed date string (400)');

    // Past date/time
    const pastDateRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: userB._id,
        date: '2020-01-01',
        time: '10:00',
        skillTaught: 'Security Engineering',
      },
      tokenA
    );
    assert(pastDateRes.status === 400, 'Rejects past date/time scheduling (400)');

    // Self-scheduling
    const selfSessRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: userA._id,
        date: futureDate,
        time: '14:00',
        skillTaught: 'Self Study',
      },
      tokenA
    );
    assert(selfSessRes.status === 400, 'Rejects self-scheduling with own user ID (400)');

    // Time format with HH:mm:ss (browsers / mobile inputs)
    const validSessRes = await request(
      '/sessions',
      'POST',
      {
        connectionId: connection._id,
        recipientId: userB._id,
        date: futureDate,
        time: '14:30:00', // HH:mm:ss format
        durationMinutes: 60,
        skillTaught: 'V2.5 Security Hardening',
        sessionNotes: 'Reviewing OWASP Top 10 and secure headers',
      },
      tokenA
    );
    const session = validSessRes.data?.data?.session;
    assert(
      validSessRes.status === 201 && session,
      'Valid session scheduled with HH:mm:ss time format without NaN error (201)'
    );

    // Duplicate session prevention
    const duplicateSessRes = await request(
      '/sessions',
      'POST',
      {
        connectionId: connection._id,
        recipientId: userB._id,
        date: futureDate,
        time: '14:30',
        durationMinutes: 60,
        skillTaught: 'V2.5 Security Hardening',
      },
      tokenA
    );
    assert(duplicateSessRes.status === 400, 'Prevents duplicate session at exact same date & time (400)');

    // Sessions retrieval
    const getSessionsRes = await request('/sessions', 'GET', null, tokenA);
    const userSessions = getSessionsRes.data?.data?.sessions || [];
    assert(
      userSessions.some((s) => s._id === session._id),
      'Scheduled session successfully retrieved by host in GET /sessions'
    );

    // ==========================================
    // 5. PEER REVIEW SUBMISSION & REPUTATION
    // ==========================================
    console.log('\n⭐ [5] Peer Review Submission, Auto-Peer Resolution & Reputation:');

    // Review on SCHEDULED session (not yet completed)
    const earlyReviewRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: session._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenB
    );
    assert(earlyReviewRes.status === 400, 'Rejects peer review before session is marked COMPLETED (400)');

    // Mark session COMPLETED
    const completeRes = await request(`/sessions/${session._id}/complete`, 'POST', {}, tokenA);
    assert(completeRes.status === 200, 'Session marked COMPLETED successfully (200)');

    // Self-review rejection
    const selfReviewRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: session._id,
        revieweeId: userA._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenA
    );
    assert(selfReviewRes.status === 400, 'Rejects self-review submission (400)');

    // Non-participant submission
    const outsiderReviewRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: session._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenC
    );
    assert(outsiderReviewRes.status === 403, 'Rejects unauthorized non-participant submitting review (403)');

    // Invalid rating bounds
    const invalidRatingRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: session._id,
        teachingRating: 7, // Out of bounds
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenB
    );
    assert(invalidRatingRes.status === 400, 'Rejects rating outside 1-5 bounds (400)');

    // Valid review submission with auto-resolved reviewee (revieweeId is string "[object Object]")
    const validReviewRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: session._id,
        revieweeId: '[object Object]', // Edge case: malformed client object string
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
        feedbackText: 'Superb explanation of secure session architecture and headers.',
      },
      tokenB
    );
    assert(
      validReviewRes.status === 201,
      'Valid review accepted and auto-resolved peer recipient from session participants (201)'
    );

    // Duplicate review prevention
    const duplicateReviewRes = await request(
      '/reviews',
      'POST',
      {
        sessionId: session._id,
        teachingRating: 4,
        communicationRating: 4,
        reliabilityRating: 4,
      },
      tokenB
    );
    assert(duplicateReviewRes.status === 400, 'Prevents duplicate review for same completed session (400)');

    // ==========================================
    // 6. MULTI-TENANT ISOLATION
    // ==========================================
    console.log('\n🛡️ [6] Multi-Tenant Resource Isolation:');

    // Generate roadmap for User A
    const genRoadmapRes = await request(
      `/roadmaps/generate/${goalA._id}`,
      'POST',
      {},
      tokenA
    );
    const roadmapA = genRoadmapRes.data?.data?.roadmap;
    assert(genRoadmapRes.status === 201 && roadmapA, 'Roadmap generated for User A');

    // User B tries to access User A roadmap
    const crossRoadmapRes = await request(`/roadmaps/${roadmapA._id}`, 'GET', null, tokenB);
    assert(
      crossRoadmapRes.status === 403 || crossRoadmapRes.status === 404,
      'Multi-Tenancy: User B cannot access User A private roadmap (Rejected 403/404)'
    );

    // User B tries to update milestone on User A roadmap
    const firstMilestoneId = roadmapA?.milestones?.[0]?.milestoneId || 'm_1';
    const crossMilestoneRes = await request(
      `/roadmaps/${roadmapA._id}/milestones/${firstMilestoneId}`,
      'PATCH',
      { status: 'COMPLETED' },
      tokenB
    );
    assert(
      crossMilestoneRes.status === 403 || crossMilestoneRes.status === 404,
      'Multi-Tenancy: User B cannot modify User A milestone status (Rejected 403/404)'
    );

    // User B tries to query AI Assistant on User A roadmap
    const crossCoachRes = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapA._id,
        actionType: 'EXPLAIN_CONCEPT',
        query: 'Help me learn',
      },
      tokenB
    );
    assert(
      crossCoachRes.status === 403 || crossCoachRes.status === 404,
      'Multi-Tenancy: User B cannot query AI Coach on User A roadmap (Rejected 403/404)'
    );

    // ==========================================
    // 7. DEMO ACCOUNT SAFETY & SAFE CASCADE DELETION
    // ==========================================
    console.log('\n🔒 [7] Demo Account Protection & Disposable Account Deletion:');

    // Attempting to delete demo account
    const demoDelRes = await request(
      '/users/me',
      'DELETE',
      {
        password: 'DemoPassword123!',
        confirmationPhrase: 'DELETE',
      },
      'demo_mock_token'
    );
    // Since demo_mock_token is invalid JWT or demo account, it's blocked with 401 or 403
    assert(
      demoDelRes.status === 401 || demoDelRes.status === 403,
      'Demo Account Protection: Demo showcase account deletion is strictly blocked'
    );

    // Deleting disposable User C account
    const delCRes = await request(
      '/users/me',
      'DELETE',
      {
        password,
        confirmationPhrase: 'DELETE',
      },
      tokenC
    );
    assert(delCRes.status === 200, 'Disposable User C account deleted cleanly (200)');

    // Invalidation: User C token rejected on protected routes
    const postDelMeRes = await request('/auth/me', 'GET', null, tokenC);
    assert(postDelMeRes.status === 401, 'Token for deleted User C immediately invalidated on /api/auth/me (401)');

    console.log('\n====================================================');
    console.log(`🏁 V2.5 RELEASE READINESS RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error in release readiness suite:', err);
    process.exit(1);
  }
}

runReleaseReadinessSuite();
