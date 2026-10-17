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

async function runSecuritySuite() {
  console.log('====================================================');
  console.log('🔒 RUNNING ENHANCEUS SECURITY & ISOLATION TEST SUITE');
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
    const emailA = `usera_${timestamp}@test.org`;
    const emailB = `userb_${timestamp}@test.org`;
    const password = 'TestPassword123!';

    // 1. Register User A
    const regA = await request('/auth/register', 'POST', {
      name: 'Tenant User A',
      email: emailA,
      password,
    });
    assert(regA.status === 201 && regA.data.data?.token, 'User A Registration');
    const tokenA = regA.data.data?.token;
    const idA = regA.data.data?.user?._id;

    // 2. Register User B
    const regB = await request('/auth/register', 'POST', {
      name: 'Tenant User B',
      email: emailB,
      password,
    });
    assert(regB.status === 201 && regB.data.data?.token, 'User B Registration');
    const tokenB = regB.data.data?.token;

    // 3. User A creates a Goal
    const createGoalRes = await request('/goals', 'POST', {
      title: "User A's Confidential App",
      description: "Building a private mobile app with React Native and Node backend.",
    }, tokenA);
    assert(createGoalRes.status === 201 && createGoalRes.data.data?.goal?._id, 'User A Goal Creation');
    const goalIdA = createGoalRes.data.data?.goal?._id;

    // 4. Multi-Tenant Isolation: User B attempts to read User A's Goal
    const readGoalRes = await request(`/goals/${goalIdA}`, 'GET', null, tokenB);
    assert(readGoalRes.status === 404 || readGoalRes.status === 403, "Tenant Isolation: User B cannot read User A's Goal");

    // 5. Multi-Tenant Isolation: User B attempts to update User A's Goal
    const updateGoalRes = await request(`/goals/${goalIdA}`, 'PATCH', { title: 'Hacked Goal' }, tokenB);
    assert(updateGoalRes.status === 404 || updateGoalRes.status === 403, "Tenant Isolation: User B cannot update User A's Goal");

    // 6. Multi-Tenant Isolation: User B attempts to delete User A's Goal
    const deleteGoalRes = await request(`/goals/${goalIdA}`, 'DELETE', null, tokenB);
    assert(deleteGoalRes.status === 404 || deleteGoalRes.status === 403, "Tenant Isolation: User B cannot delete User A's Goal");

    // 7. Protected Field Mass-Assignment Protection
    const profileUpdateRes = await request('/users/profile', 'PATCH', {
      name: 'Tenant User A (Updated)',
      role: 'admin',
      isDemo: true,
    }, tokenA);
    assert(
      profileUpdateRes.status === 200 &&
      profileUpdateRes.data.data?.user?.role === 'user' &&
      !profileUpdateRes.data.data?.user?.isDemo,
      'Field Protection: Prevent mass-assignment of role and isDemo'
    );

    // 8. Public Profile Data Sanitization
    const publicProfileRes = await request(`/users/${idA}`, 'GET', null, tokenB);
    const pubUser = publicProfileRes.data.data?.user;
    assert(
      publicProfileRes.status === 200 &&
      pubUser &&
      pubUser.password === undefined &&
      pubUser.email === undefined,
      'Public Profile Boundary: Sensitive fields (password, email) scrubbed'
    );

    // 9. Onboarding Completion Persistence
    const onboardRes = await request('/users/onboarding/complete', 'POST', {}, tokenA);
    assert(
      onboardRes.status === 200 &&
      onboardRes.data.data?.user?.onboardingCompletedAt !== null,
      'Onboarding Persistence: Server completes onboarding timestamp'
    );

    // 10. Clean New Account Data Isolation (Zero Demo Artifact Leakage)
    const goalsBRes = await request('/goals', 'GET', null, tokenB);
    const sessionsBRes = await request('/sessions', 'GET', null, tokenB);
    assert(
      goalsBRes.data.data?.goals?.length === 0 &&
      sessionsBRes.data.data?.sessions?.length === 0,
      'Zero Demo Leakage: Newly registered accounts contain 0 fake fallback data'
    );

    // 11. Demo Account Credentials & Isolated Access
    const demoCredsRes = await request('/auth/demo-credentials', 'GET');
    assert(
      demoCredsRes.status === 200 &&
      demoCredsRes.data.data?.email === 'demo@enhanceus.org',
      'Demo Account Endpoint: Demo credentials endpoint functional'
    );

    console.log('\n====================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runSecuritySuite();
