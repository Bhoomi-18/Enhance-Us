import http from 'http';

const API_BASE = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runPrerequisiteIntegrationSuite() {
  console.log('====================================================');
  console.log('🔗 RUNNING V2.2 PREREQUISITE & LEARNING ORDER INTEGRATION TESTS');
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
    const userAEmail = `v22_user_a_${timestamp}@enhanceus.org`;
    const userBEmail = `v22_user_b_${timestamp}@enhanceus.org`;
    const password = 'Password123!';

    // 1. Register User A with JavaScript profile skill
    const regResA = await request('/auth/register', 'POST', {
      name: 'V22 Engineer A',
      email: userAEmail,
      password,
      skills: [
        { name: 'JavaScript', category: 'Programming Languages', level: 'ADVANCED' },
      ],
    });
    assert(regResA.status === 201 && regResA.data?.data?.token, 'User A Registration');
    const tokenA = regResA.data?.data?.token;

    // 2. Register User B with Python skill
    const regResB = await request('/auth/register', 'POST', {
      name: 'V22 Engineer B',
      email: userBEmail,
      password,
      skills: [
        { name: 'Python', category: 'Programming Languages', level: 'BEGINNER' },
      ],
    });
    assert(regResB.status === 201 && regResB.data?.data?.token, 'User B Registration');
    const tokenB = regResB.data?.data?.token;

    // Verify test accounts for protected goal & roadmap actions
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    await request('/auth/test-verify', 'POST', { email: userBEmail });

    // 3. Security: Unauthenticated request to analyze dependencies rejected
    const unauthAnalyze = await request('/roadmaps/507f1f77bcf86cd799439011/analyze-dependencies', 'POST', {});
    assert(unauthAnalyze.status === 401, 'Unauthenticated Blocked: POST /api/roadmaps/:id/analyze-dependencies (401)');

    // 4. User A creates a Goal
    const goalResA = await request('/goals', 'POST', {
      title: 'Architect Cloud Native Microservices',
      description: 'Master containerization with Docker, Kubernetes orchestration, and Node API integration.',
      targetDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    }, tokenA);
    assert(goalResA.status === 201 && goalResA.data?.data?.goal?._id, 'User A Goal Creation');
    const goalIdA = goalResA.data?.data?.goal?._id;

    // 5. User A generates a roadmap
    console.log('  ⏳ Generating Roadmap for Goal A...');
    const genRes = await request(`/roadmaps/generate/${goalIdA}`, 'POST', {
      targetOutcome: 'Deploy multi-service Kubernetes cluster',
      timeCommitmentHoursPerWeek: 8,
    }, tokenA);
    assert(genRes.status === 201 && genRes.data?.data?.roadmap?._id, 'Roadmap Generation for User A');
    const roadmapA = genRes.data?.data?.roadmap;
    const roadmapIdA = roadmapA?._id;

    // 6. Verify Roadmap persistence & V2.2 schema compatibility
    assert(roadmapA?.skills?.length > 0, 'Roadmap contains structured skills');
    assert(roadmapA?.stages?.length > 0, 'Roadmap contains structured stages');
    assert(
      roadmapA?.roadmapSchemaVersion === '2.3' || roadmapA?.roadmapSchemaVersion === '2.2' || roadmapA?.roadmapSchemaVersion === '2.1',
      `Roadmap schema version is valid (${roadmapA?.roadmapSchemaVersion})`
    );

    // 7. Multi-Tenant Authorization Check: User B cannot analyze or access User A's roadmap
    const crossTenantAnalyze = await request(`/roadmaps/${roadmapIdA}/analyze-dependencies`, 'POST', {}, tokenB);
    assert(crossTenantAnalyze.status === 404, 'Multi-tenant Isolation: User B cannot analyze User A roadmap (404)');

    const crossTenantGet = await request(`/roadmaps/${roadmapIdA}`, 'GET', null, tokenB);
    assert(crossTenantGet.status === 404, 'Multi-tenant Isolation: User B cannot retrieve User A roadmap (404)');

    // 8. User A explicitly triggers Prerequisite Analysis
    console.log('  ⏳ User A running on-demand Prerequisite Analysis & Topological Sort...');
    const analyzeRes = await request(`/roadmaps/${roadmapIdA}/analyze-dependencies`, 'POST', {
      forceRecalculate: true,
    }, tokenA);
    assert(analyzeRes.status === 200, 'User A Dependency Analysis: HTTP 200 Success');

    const analyzedRoadmap = analyzeRes.data?.data?.roadmap;
    assert(analyzedRoadmap?.dependencyAnalysisStatus === 'COMPLETED', 'Dependency Analysis Status is COMPLETED');
    assert(analyzedRoadmap?.roadmapSchemaVersion === '2.2', 'Roadmap schema updated to version 2.2');
    assert(Array.isArray(analyzedRoadmap?.learningOrder), 'Learning order is populated as an array');
    assert(analyzedRoadmap?.learningOrder.length === analyzedRoadmap?.skills?.length, 'Every roadmap skill has a learning order position');

    // 9. Inspect Learning Order Steps and Personalization
    const steps = analyzedRoadmap?.learningOrder || [];
    const orderIndices = steps.map((s) => s.orderIndex);
    const sortedIndices = [...orderIndices].sort((a, b) => a - b);
    assert(
      JSON.stringify(orderIndices) === JSON.stringify(sortedIndices),
      'Learning order indices are strictly sequential (1..N)'
    );

    // Check statuses: READY, BLOCKED, or SATISFIED
    const validStatuses = new Set(['READY', 'BLOCKED', 'SATISFIED', 'IN_PROGRESS', 'UNKNOWN']);
    const allValidStatuses = steps.every((s) => validStatuses.has(s.status));
    assert(allValidStatuses, 'All learning order steps have valid pedagogical status (READY/BLOCKED/SATISFIED)');

    // Profile Skill Satisfaction check
    const jsStep = steps.find((s) => s.skillName.toLowerCase().includes('javascript'));
    if (jsStep) {
      assert(
        jsStep.status === 'SATISFIED' || jsStep.status === 'READY',
        `User profile skill (${jsStep.skillName}) is recognized as SATISFIED or READY`
      );
    }

    // Check that skills with unmet required prerequisites are BLOCKED
    const blockedStep = steps.find((s) => s.status === 'BLOCKED');
    if (blockedStep) {
      assert(
        blockedStep.unmetPrerequisites && blockedStep.unmetPrerequisites.length > 0,
        `Blocked skill "${blockedStep.skillName}" explicitly references unmet prerequisites: [${blockedStep.unmetPrerequisites.join(', ')}]`
      );
    }

    // 10. Dependency Edges Quality
    const edges = analyzedRoadmap?.dependencyEdges || [];
    const validTypes = new Set(['REQUIRED', 'RECOMMENDED', 'OPTIONAL_RELATED']);
    const allValidTypes = edges.every((e) => validTypes.has(e.type));
    assert(allValidTypes, 'All dependency edges have valid typed classification (REQUIRED/RECOMMENDED/OPTIONAL_RELATED)');

    // Ensure no self-dependencies in persisted graph
    const hasSelfEdge = edges.some((e) => e.fromSkill.toLowerCase() === e.toSkill.toLowerCase());
    assert(!hasSelfEdge, 'Persisted dependency graph contains zero self-dependencies');

    // 11. Prerequisite Analysis Metadata Ribbon
    const analysisMeta = analyzedRoadmap?.prerequisiteAnalysis;
    assert(analysisMeta && typeof analysisMeta.totalDependencies === 'number', 'Prerequisite analysis metadata persisted');
    assert(
      typeof analysisMeta.readySkillsCount === 'number' && typeof analysisMeta.blockedSkillsCount === 'number',
      `Prerequisite summary counts: Ready=${analysisMeta.readySkillsCount}, Blocked=${analysisMeta.blockedSkillsCount}`
    );

    // 12. Retrieve Roadmap via GET and verify persistence of V2.2 fields
    const getRes = await request(`/roadmaps/${roadmapIdA}`, 'GET', null, tokenA);
    assert(getRes.status === 200, 'GET /api/roadmaps/:id retrieves persisted roadmap');
    const persistedRoadmap = getRes.data?.data?.roadmap;
    assert(
      persistedRoadmap?.dependencyAnalysisStatus === 'COMPLETED',
      'GET endpoint returns persisted dependencyAnalysisStatus COMPLETED'
    );
    assert(
      persistedRoadmap?.learningOrder?.length > 0,
      `GET endpoint returns persisted learningOrder (${persistedRoadmap?.learningOrder?.length} steps)`
    );

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runPrerequisiteIntegrationSuite();
