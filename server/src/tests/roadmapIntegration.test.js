import http from 'http';
import { GeminiRoadmapService } from '../services/geminiRoadmapService.js';

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

async function runRoadmapIntegrationSuite() {
  console.log('====================================================');
  console.log('🗺️  RUNNING ENHANCEUS V2.1 ROADMAP INTEGRATION TEST SUITE');
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
    const userAEmail = `user_a_roadmap_${timestamp}@enhanceus.org`;
    const userBEmail = `user_b_roadmap_${timestamp}@enhanceus.org`;
    const password = 'TestPassword123!';

    // Register User A with profile skills
    const regResA = await request('/auth/register', 'POST', {
      name: 'Roadmap User A',
      email: userAEmail,
      password,
      skills: [
        { name: 'JavaScript', category: 'Programming Languages', level: 'ADVANCED' },
        { name: 'React', category: 'Frontend', level: 'INTERMEDIATE' },
      ],
    });
    assert(regResA.status === 201 && regResA.data.data?.token, 'User A Registration');
    const tokenA = regResA.data.data?.token;
    const userIdA = regResA.data.data?.user?._id;

    // Register User B
    const regResB = await request('/auth/register', 'POST', {
      name: 'Roadmap User B',
      email: userBEmail,
      password,
      skills: [
        { name: 'Python', category: 'Programming Languages', level: 'BEGINNER' },
      ],
    });
    assert(regResB.status === 201 && regResB.data.data?.token, 'User B Registration');
    const tokenB = regResB.data.data?.token;
    const userIdB = regResB.data.data?.user?._id;

    // Verify test accounts for protected goal & roadmap actions
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    await request('/auth/test-verify', 'POST', { email: userBEmail });

    // Test 1: Unauthenticated access blocked on all roadmap endpoints
    const unauthGen = await request('/roadmaps/generate/507f1f77bcf86cd799439011', 'POST', {});
    assert(unauthGen.status === 401, 'Unauthenticated Blocked: POST /api/roadmaps/generate/:id (401)');

    const unauthList = await request('/roadmaps', 'GET');
    assert(unauthList.status === 401, 'Unauthenticated Blocked: GET /api/roadmaps (401)');

    const unauthGet = await request('/roadmaps/507f1f77bcf86cd799439011', 'GET');
    assert(unauthGet.status === 401, 'Unauthenticated Blocked: GET /api/roadmaps/:id (401)');

    const unauthDelete = await request('/roadmaps/507f1f77bcf86cd799439011', 'DELETE');
    assert(unauthDelete.status === 401, 'Unauthenticated Blocked: DELETE /api/roadmaps/:id (401)');

    await sleep(50);

    // Test 2: User A creates a Goal
    const createGoalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Cloud Native DevOps & Kubernetes',
        description:
          'Design and deploy scalable containerized microservices on AWS using Docker, Kubernetes, and CI/CD pipelines.',
      },
      tokenA
    );
    assert(createGoalRes.status === 201 && createGoalRes.data?.data?.goal?._id, 'User A Goal Creation');
    const goalAId = createGoalRes.data?.data?.goal?._id;

    await sleep(50);

    // Test 3: Cross-tenant Goal access: User B cannot generate a roadmap for User A's goal
    const crossTenantGen = await request(
      `/roadmaps/generate/${goalAId}`,
      'POST',
      { timeCommitmentHoursPerWeek: 10 },
      tokenB
    );
    assert(
      crossTenantGen.status === 404,
      'Multi-Tenant Isolation: User B cannot generate roadmap from User A goal (404)'
    );

    await sleep(50);

    // Test 4: User A generates a roadmap for their own goal
    const generateRes = await request(
      `/roadmaps/generate/${goalAId}`,
      'POST',
      {
        timeCommitmentHoursPerWeek: 8,
        targetOutcome: 'Deploy production microservices cluster with automated CI/CD',
      },
      tokenA
    );

    assert(
      generateRes.status === 201 && generateRes.data.data?.roadmap?._id,
      'Roadmap Generation: Created 201 with populated roadmap document'
    );

    const roadmapA = generateRes.data.data?.roadmap;
    const roadmapAId = roadmapA?._id;

    // Test 5: Verify Roadmap Structure and Content Integrity
    assert(
      typeof roadmapA?.title === 'string' &&
        roadmapA.title.length > 3 &&
        typeof roadmapA?.goalSummary === 'string' &&
        typeof roadmapA?.estimatedDuration === 'string' &&
        Array.isArray(roadmapA?.assumptions) &&
        Array.isArray(roadmapA?.skills) &&
        roadmapA.skills.length >= 2 &&
        Array.isArray(roadmapA?.stages) &&
        roadmapA.stages.length >= 1,
      'Roadmap Content: Contains title, goalSummary, duration, assumptions, skills, and stages'
    );

    // Test 6: Verify Stage Skill Cross-Referencing
    const validSkillNames = new Set(roadmapA.skills.map((s) => s.name.toLowerCase()));
    const allStageSkillsValid = roadmapA.stages.every((stg) =>
      stg.skillNames.every((sn) => validSkillNames.has(sn.toLowerCase()))
    );
    assert(
      allStageSkillsValid,
      'Data Integrity: All skills referenced in stages exist within the roadmap skills list'
    );

    // Test 7: Verify Multi-Tenant Isolation on Roadmap Retrieval
    // User A should see their roadmap
    const listResA = await request('/roadmaps', 'GET', null, tokenA);
    assert(
      listResA.status === 200 &&
        listResA.data.data?.roadmaps?.some((r) => r._id === roadmapAId),
      'User A can list their own saved roadmaps'
    );

    // User B should NOT see User A's roadmap
    const listResB = await request('/roadmaps', 'GET', null, tokenB);
    assert(
      listResB.status === 200 &&
        listResB.data.data?.roadmaps?.length === 0,
      'Multi-Tenant Isolation: User B lists 0 roadmaps (no cross-user leakage)'
    );

    // User B cannot fetch User A's roadmap by ID
    const getResB = await request(`/roadmaps/${roadmapAId}`, 'GET', null, tokenB);
    assert(
      getResB.status === 404,
      'Multi-Tenant Isolation: User B receives 404 when requesting User A roadmap ID'
    );

    // User A can fetch their own roadmap by ID with populated goal
    const getResA = await request(`/roadmaps/${roadmapAId}`, 'GET', null, tokenA);
    assert(
      getResA.status === 200 &&
        getResA.data.data?.roadmap?._id === roadmapAId &&
        getResA.data.data?.roadmap?.goal?.title === 'Master Cloud Native DevOps & Kubernetes',
      'User A retrieves own roadmap with populated goal details'
    );

    // Test 8: Multi-Tenant Isolation on Deletion
    // User B cannot delete User A's roadmap
    const deleteResB = await request(`/roadmaps/${roadmapAId}`, 'DELETE', null, tokenB);
    assert(
      deleteResB.status === 404,
      'Multi-Tenant Isolation: User B cannot delete User A roadmap (404)'
    );

    // User A can delete their own roadmap
    const deleteResA = await request(`/roadmaps/${roadmapAId}`, 'DELETE', null, tokenA);
    assert(
      deleteResA.status === 200,
      'User A successfully deletes own roadmap (200)'
    );

    // Verify roadmap is gone
    const getResDeleted = await request(`/roadmaps/${roadmapAId}`, 'GET', null, tokenA);
    assert(
      getResDeleted.status === 404,
      'Deleted roadmap no longer accessible (404)'
    );

    // Test 9: Provider Unit Test - Malformed JSON Handling
    const service = new GeminiRoadmapService();
    let malformedHandled = false;
    try {
      service.validateAndNormalizeRoadmap('NOT VALID JSON', 'Goal Title', []);
    } catch (e) {
      malformedHandled = e.statusCode === 502;
    }
    assert(
      malformedHandled,
      'Provider Resilience: Malformed Gemini JSON safely caught and throws 502 ApiError'
    );

    // Test 10: Provider Unit Test - HTML and Script Sanitization
    const mockDirtyAiResponse = JSON.stringify({
      title: 'DevOps <script>alert("xss")</script> Roadmap',
      goalSummary: 'Learn to deploy <b>safely</b> and avoid <iframe src="bad.com"></iframe>',
      estimatedDuration: '6-8 weeks',
      assumptions: ['Basic Linux knowledge <script>evil()</script>'],
      skills: [
        {
          name: 'Docker <i>Containers</i>',
          description: 'Package apps cleanly <script>bad()</script>',
          currentLevel: 'beginner',
          targetLevel: 'advanced',
          gapExplanation: 'Needs Dockerfile optimization practice',
          priority: 'high',
          learningObjectives: ['Write multi-stage Dockerfiles <script></script>'],
        },
      ],
      stages: [
        {
          title: 'Stage 1: Container Basics',
          description: 'Build images without <script>evil()</script>',
          skillNames: ['Docker Containers'],
          completionCriteria: ['Deploy single container'],
        },
      ],
    });

    const sanitized = service.validateAndNormalizeRoadmap(
      mockDirtyAiResponse,
      'DevOps Roadmap',
      []
    );
    assert(
      !sanitized.title.includes('<script>') &&
        !sanitized.goalSummary.includes('<b>') &&
        !sanitized.goalSummary.includes('<iframe>') &&
        !sanitized.assumptions[0].includes('<script>') &&
        !sanitized.skills[0].name.includes('<i>'),
      'Security Sanitization: HTML tags and malicious script payloads stripped from model output'
    );

    // Test 11: Provider Unit Test - Stage skill normalization & missing stage references
    const mockInvalidStageResponse = JSON.stringify({
      title: 'Valid Title',
      goalSummary: 'Valid Summary',
      estimatedDuration: '4 weeks',
      assumptions: ['Assumption 1'],
      skills: [
        {
          name: 'GraphQL',
          description: 'API query language',
          currentLevel: 'unknown',
          targetLevel: 'intermediate',
          gapExplanation: 'Need schema design skills',
          priority: 'high',
          learningObjectives: ['Define schemas', 'Write resolvers'],
        },
      ],
      stages: [
        {
          title: 'Stage 1',
          description: 'Stage description',
          // References a non-existent skill 'NonExistentSkill'
          skillNames: ['NonExistentSkill'],
          completionCriteria: ['Criterion 1'],
        },
      ],
    });

    const normalizedStageResult = service.validateAndNormalizeRoadmap(
      mockInvalidStageResponse,
      'GraphQL Roadmap',
      []
    );
    assert(
      normalizedStageResult.stages[0].skillNames.includes('GraphQL') &&
        !normalizedStageResult.stages[0].skillNames.includes('NonExistentSkill'),
      'Stage Integrity: References to non-existent skills filtered and mapped to valid roadmap skills'
    );

    console.log('\n====================================================');
    console.log(`ROADMAP SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Roadmap integration test suite execution failed:', err);
    process.exit(1);
  }
}

runRoadmapIntegrationSuite();
