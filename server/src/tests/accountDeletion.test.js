import http from 'http';

const API_BASE = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runAccountDeletionSuite() {
  console.log('====================================================');
  console.log('🗑️  RUNNING ENHANCEUS ACCOUNT DELETION TEST SUITE');
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
    const timestamp = Date.now();
    const userAEmail = `delete_victim_${timestamp}@enhanceus.org`;
    const userBEmail = `delete_survivor_${timestamp}@enhanceus.org`;
    const password = 'TestPassword123!';

    // Register User A
    const regResA = await request('/auth/register', 'POST', {
      name: 'User To Delete',
      email: userAEmail,
      password,
    });
    assert(regResA.status === 201 && regResA.data?.data?.token, 'User A Registration');
    const tokenA = regResA.data?.data?.token;
    const userIdA = regResA.data?.data?.user?._id;

    // Register User B
    const regResB = await request('/auth/register', 'POST', {
      name: 'Surviving User',
      email: userBEmail,
      password,
    });
    assert(regResB.status === 201 && regResB.data?.data?.token, 'User B Registration');
    const tokenB = regResB.data?.data?.token;
    const userIdB = regResB.data?.data?.user?._id;

    // Verify test accounts for protected actions
    await request('/auth/test-verify', 'POST', { userId: userIdA });
    await request('/auth/test-verify', 'POST', { userId: userIdB });

    // Test 1: Unauthenticated request to delete account rejected
    const unauthRes = await request('/users/me', 'DELETE', {
      password,
      confirmationPhrase: 'DELETE',
    });
    assert(unauthRes.status === 401, 'Unauthenticated Account Deletion Blocked (401)');

    await sleep(30);

    // Test 2: Rejection with incorrect password
    const wrongPasswordRes = await request(
      '/users/me',
      'DELETE',
      {
        password: 'WrongPassword999!',
        confirmationPhrase: 'DELETE',
      },
      tokenA
    );
    assert(
      wrongPasswordRes.status === 401 &&
        wrongPasswordRes.data?.message?.toLowerCase().includes('password'),
      'Reauthentication Protection: Rejects invalid password (401)'
    );

    await sleep(30);

    // Test 3: Rejection with missing or incorrect confirmation phrase
    const badPhraseRes = await request(
      '/users/me',
      'DELETE',
      {
        password,
        confirmationPhrase: 'delete', // lowercase mismatch
      },
      tokenA
    );
    assert(
      badPhraseRes.status === 400 &&
        badPhraseRes.data?.message?.toLowerCase().includes('validation'),
      'Deliberate Confirmation Protection: Rejects non-exact phrase (400)'
    );

    await sleep(30);

    // Test 4: Create goal for User A before deletion
    const goalResA = await request(
      '/goals',
      'POST',
      {
        title: 'User A Full Stack Goal',
        description: 'Building a scalable web service with React and Node.js.',
      },
      tokenA
    );
    assert(goalResA.status === 201 && goalResA.data?.data?.goal?._id, 'User A Goal Created');
    const goalAId = goalResA.data?.data?.goal?._id;

    // Create goal for User B
    const goalResB = await request(
      '/goals',
      'POST',
      {
        title: 'User B Cloud Architecture Goal',
        description: 'Designing Kubernetes microservices and cloud infrastructure.',
      },
      tokenB
    );
    assert(goalResB.status === 201 && goalResB.data?.data?.goal?._id, 'User B Goal Created');
    const goalBId = goalResB.data?.data?.goal?._id;

    await sleep(30);

    // Test 5: Multi-tenant safety: Passing User B's ID in body does NOT delete User B
    const spoofRes = await request(
      '/users/me',
      'DELETE',
      {
        userId: userIdB, // Malicious client attempt
        targetUserId: userIdB,
        password,
        confirmationPhrase: 'DELETE',
      },
      tokenA
    );
    // User A deleted THEIR OWN account, NOT User B
    assert(
      spoofRes.status === 200 &&
        spoofRes.data?.message?.toLowerCase().includes('deleted'),
      'Account Deletion: Successfully deleted authenticated User A account (200)'
    );

    await sleep(30);

    // Test 6: Invalidation: User A's token cannot access protected endpoints anymore
    const postDeleteMeRes = await request('/auth/me', 'GET', null, tokenA);
    assert(
      postDeleteMeRes.status === 401,
      'Authentication Invalidation: Deleted user token rejected on /api/auth/me (401)'
    );

    const postDeleteGoalsRes = await request('/goals', 'GET', null, tokenA);
    assert(
      postDeleteGoalsRes.status === 401,
      'Authentication Invalidation: Deleted user token rejected on /api/goals (401)'
    );

    await sleep(30);

    // Test 7: User B's account, session, and goals remain 100% intact
    const survivorMeRes = await request('/auth/me', 'GET', null, tokenB);
    assert(
      survivorMeRes.status === 200 && survivorMeRes.data?.data?.user?.email === userBEmail,
      'Data Integrity: Surviving User B session and account remain intact'
    );

    const survivorGoalsRes = await request('/goals', 'GET', null, tokenB);
    assert(
      survivorGoalsRes.status === 200 &&
        survivorGoalsRes.data?.data?.goals?.some((g) => g._id === goalBId),
      'Referential Integrity: Surviving User B goals remain intact'
    );

    // Test 8: Demo Account Deletion Protection
    // Obtain demo account token
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: 'demo@enhanceus.org',
      password: 'DemoPassword123!',
    });

    if (demoLoginRes.status === 200 && demoLoginRes.data?.data?.token) {
      const demoToken = demoLoginRes.data.data.token;
      const deleteDemoRes = await request(
        '/users/me',
        'DELETE',
        {
          password: 'DemoPassword123!',
          confirmationPhrase: 'DELETE',
        },
        demoToken
      );
      assert(
        deleteDemoRes.status === 403,
        'Demo Account Protection: Demo showcase account deletion is blocked (403)'
      );
    } else {
      console.log('  ℹ️  [SKIP] Demo login check skipped in offline environment');
    }

    console.log('\n====================================================');
    console.log(`ACCOUNT DELETION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Account deletion test suite failed:', err);
    process.exit(1);
  }
}

runAccountDeletionSuite();
