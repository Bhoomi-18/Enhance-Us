import http from 'http';

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

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
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

async function runSessionAndReviewSuite() {
  console.log('====================================================');
  console.log('📅 RUNNING ENHANCEUS SESSION SCHEDULING & REVIEW SUITE');
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
    const emailA = `sess_user_a_${ts}@test.org`;
    const emailB = `sess_user_b_${ts}@test.org`;
    const emailC = `sess_user_c_${ts}@test.org`;
    const password = 'TestPassword123!';

    // 1. Register User A, B, and C
    const regA = await request('/auth/register', 'POST', {
      name: 'Session Host User A',
      email: emailA,
      password,
    });
    const tokenA = regA.data?.data?.token;
    const userA = regA.data?.data?.user;
    assert(regA.status === 201 && tokenA, 'Register User A (Host)');

    const regB = await request('/auth/register', 'POST', {
      name: 'Session Peer User B',
      email: emailB,
      password,
    });
    const tokenB = regB.data?.data?.token;
    const userB = regB.data?.data?.user;
    assert(regB.status === 201 && tokenB, 'Register User B (Peer)');

    const regC = await request('/auth/register', 'POST', {
      name: 'Outsider User C',
      email: emailC,
      password,
    });
    const tokenC = regC.data?.data?.token;
    const userC = regC.data?.data?.user;
    assert(regC.status === 201 && tokenC, 'Register User C (Outsider)');

    // Verify test accounts for protected session actions
    await request('/auth/test-verify', 'POST', { email: emailA });
    await request('/auth/test-verify', 'POST', { email: emailB });
    await request('/auth/test-verify', 'POST', { email: emailC });

    // 2. User A creates a Goal
    const goalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Node.js Microservices',
        description: 'Building distributed scalable cloud backends with Redis and MongoDB.',
        targetDate: new Date(Date.now() + 864000000).toISOString(),
      },
      tokenA
    );
    const goalId = goalRes.data?.data?.goal?._id;
    assert(goalRes.status === 201 && goalId, 'User A Goal Creation');

    // 3. User A sends an Exchange Request to User B
    const reqRes = await request(
      '/exchanges/request',
      'POST',
      {
        recipientId: userB._id,
        goalId,
        offeredSkill: 'Node.js',
        requestedSkill: 'Docker',
        proposedExchange: 'I will teach you Node.js if you help me with Docker containerization.',
      },
      tokenA
    );
    const requestId = reqRes.data?.data?.exchangeRequest?._id;
    assert(reqRes.status === 201 && requestId, 'Exchange Request Sent A -> B');

    // 4. User B accepts the Exchange Request -> Creates Connection
    const acceptRes = await request(`/exchanges/requests/${requestId}/accept`, 'POST', {}, tokenB);
    const connectionId = acceptRes.data?.data?.connection?._id;
    assert(acceptRes.status === 200 && connectionId, 'Exchange Request Accepted -> Connection Created');

    // 5. Verify GET /exchanges/connections
    const connsRes = await request('/exchanges/connections', 'GET', null, tokenA);
    const activeConns = connsRes.data?.data?.connections || [];
    assert(
      connsRes.status === 200 && activeConns.some((c) => c._id === connectionId),
      'GET /exchanges/connections returns newly established connection'
    );

    // ==========================================
    // PART A: SESSION SCHEDULING TESTS
    // ==========================================

    // 6. Rejects missing required fields
    const missingDateRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: userB._id,
        skillTaught: 'Node.js',
      },
      tokenA
    );
    assert(missingDateRes.status === 400, 'Rejects session missing required date and time (400)');

    // 7. Rejects past date/time
    const pastDateRes = await request(
      '/sessions',
      'POST',
      {
        connectionId,
        recipientId: userB._id,
        date: '2020-01-01',
        time: '10:00',
        skillTaught: 'Node.js',
      },
      tokenA
    );
    assert(pastDateRes.status === 400, 'Rejects past date/time scheduling (400)');

    // 8. Rejects self-scheduling
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const selfSchedRes = await request(
      '/sessions',
      'POST',
      {
        recipientId: userA._id,
        date: tomorrow,
        time: '14:00',
        skillTaught: 'Node.js',
      },
      tokenA
    );
    assert(selfSchedRes.status === 400, 'Rejects self-scheduling session with own user ID (400)');

    // 9. Rejects scheduling against unauthorized connection
    const unauthConnRes = await request(
      '/sessions',
      'POST',
      {
        connectionId, // Belongs to A and B, User C is not participant!
        recipientId: userA._id,
        date: tomorrow,
        time: '14:00',
        skillTaught: 'Docker',
      },
      tokenC
    );
    assert(unauthConnRes.status === 403, 'Rejects scheduling against unauthorized connection (403)');

    // 10. Valid session scheduling succeeds
    const schedRes = await request(
      '/sessions',
      'POST',
      {
        connectionId,
        recipientId: userB._id,
        date: tomorrow,
        time: '16:00',
        durationMinutes: 60,
        skillTaught: 'Node.js Architecture',
        sessionNotes: 'Deep dive into event loop and microservices.',
      },
      tokenA
    );
    const sessionId = schedRes.data?.data?.session?._id;
    assert(schedRes.status === 201 && sessionId, 'Valid session scheduled successfully (201)');

    // 11. Prevents duplicate session scheduling at same date & time
    const dupRes = await request(
      '/sessions',
      'POST',
      {
        connectionId,
        recipientId: userB._id,
        date: tomorrow,
        time: '16:00',
        durationMinutes: 60,
        skillTaught: 'Node.js Architecture',
      },
      tokenA
    );
    assert(dupRes.status === 400, 'Prevents duplicate session at exact same date & time (400)');

    // 12. Verify session appears in GET /sessions for both participants
    const userASessions = await request('/sessions', 'GET', null, tokenA);
    const userBSessions = await request('/sessions', 'GET', null, tokenB);
    const inA = userASessions.data?.data?.sessions?.some((s) => s._id === sessionId);
    const inB = userBSessions.data?.data?.sessions?.some((s) => s._id === sessionId);
    assert(inA && inB, 'Session appears in GET /sessions for both participants');

    // ==========================================
    // PART B: PEER REVIEW & RATING TESTS
    // ==========================================

    // 13. Rejects review on non-completed session
    const earlyRevRes = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id,
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
        feedbackText: 'Great teacher!',
      },
      tokenB
    );
    assert(earlyRevRes.status === 400, 'Rejects review on SCHEDULED non-completed session (400)');

    // 14. Mark session completed
    const completeRes = await request(`/sessions/${sessionId}/complete`, 'POST', {}, tokenA);
    assert(completeRes.status === 200, 'Session marked COMPLETED (200)');

    // 15. Rejects self-review
    const selfRevRes = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id, // User A trying to review User A!
        teachingRating: 5,
        communicationRating: 5,
        reliabilityRating: 5,
      },
      tokenA
    );
    assert(selfRevRes.status === 400, 'Rejects self-review submission (400)');

    // 16. Rejects invalid ratings bounds (<1 or >5)
    const invalidRatingRes = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        revieweeId: userA._id,
        teachingRating: 10,
        communicationRating: 0,
        reliabilityRating: 5,
      },
      tokenB
    );
    assert(invalidRatingRes.status === 400, 'Rejects invalid rating values outside 1-5 range (400)');

    // 17. Rejects unauthorized outsider (User C) submitting review
    const outsiderRevRes = await request(
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
    assert(outsiderRevRes.status === 403, 'Rejects unauthorized non-participant submitting review (403)');

    // 18. Valid peer review submission succeeds with optional feedbackText omitted
    const validRevRes = await request(
      '/reviews',
      'POST',
      {
        sessionId,
        // revieweeId omitted to test auto-resolution from session!
        teachingRating: 5,
        communicationRating: 4,
        reliabilityRating: 5,
        // feedbackText omitted to verify it is strictly optional!
      },
      tokenB
    );
    const reviewId = validRevRes.data?.data?.review?._id;
    assert(
      validRevRes.status === 201 && reviewId && validRevRes.data?.data?.review?.overallRating === 4.7,
      'Valid peer review accepted with auto-resolved reviewee and optional feedback omitted (201)'
    );

    // 19. Rejects duplicate review from same reviewer for same session
    const dupRevRes = await request(
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
    assert(dupRevRes.status === 400, 'Rejects duplicate review for the same completed session (400)');

    // 20. Verify User A's reputation reflects new review
    const userAProfile = await request(`/users/${userA._id}`, 'GET', null, tokenA);
    const rep = userAProfile.data?.data?.user?.reputation;
    assert(
      userAProfile.status === 200 && rep?.reviewCount >= 1 && rep?.averageRating >= 4.0,
      'User A reputation updated with review count and calculated average'
    );

  } catch (err) {
    console.error('Fatal suite failure:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSessionAndReviewSuite();
