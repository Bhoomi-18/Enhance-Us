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

async function runAssistantIntegrationSuite() {
  console.log('====================================================');
  console.log('🤖 RUNNING V2.4 AI LEARNING COACH & RESOURCE INTEGRATION TESTS');
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
    const userAEmail = `v24_user_a_${timestamp}@enhanceus.org`;
    const userBEmail = `v24_user_b_${timestamp}@enhanceus.org`;
    const password = 'Password123!';

    // ------------------------------------------------------------------
    // STEP 1: AUTHENTICATION ENFORCEMENT
    // ------------------------------------------------------------------
    console.log('🔒 [1] Authentication Enforcement:');

    const unauthQuery = await request('/assistant/query', 'POST', {
      roadmapId: 'some_id',
      actionType: 'EXPLAIN_CONCEPT',
    });
    assert(unauthQuery.status === 401, 'Auth: Unauthenticated assistant query rejected with 401');

    const unauthResources = await request('/resources');
    assert(unauthResources.status === 401, 'Auth: Unauthenticated resource access rejected with 401');

    const unauthBookmarks = await request('/resources/bookmarked');
    assert(unauthBookmarks.status === 401, 'Auth: Unauthenticated bookmark access rejected with 401');

    // ------------------------------------------------------------------
    // STEP 2: REGISTER DISPOSABLE TEST USERS
    // ------------------------------------------------------------------
    console.log('\n👤 [2] Registering Test Users:');

    const regA = await request('/auth/register', 'POST', {
      name: 'V24 User Alpha',
      email: userAEmail,
      password,
    });
    assert(regA.status === 201 && regA.data.data?.token, 'Register: User A created successfully');
    const tokenA = regA.data.data?.token;

    const regB = await request('/auth/register', 'POST', {
      name: 'V24 User Beta',
      email: userBEmail,
      password,
    });
    assert(regB.status === 201 && regB.data.data?.token, 'Register: User B created successfully');
    const tokenB = regB.data.data?.token;

    // Verify test accounts for protected actions
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    await request('/auth/test-verify', 'POST', { email: userBEmail });

    // ------------------------------------------------------------------
    // STEP 3: CREATE GOAL & ROADMAP FOR USER A
    // ------------------------------------------------------------------
    console.log('\n🗺️ [3] Create Learning Goal & Roadmap for User A:');

    const goalRes = await request(
      '/goals',
      'POST',
      {
        title: 'Master Fullstack Docker & React',
        description: 'Learn modern Docker containers, Compose, and React fullstack applications.',
      },
      tokenA
    );
    assert(goalRes.status === 201 && goalRes.data.data?.goal?._id, 'Goal: User A goal created');
    const goalId = goalRes.data.data?.goal?._id;

    const roadmapRes = await request(
      `/roadmaps/generate/${goalId}`,
      'POST',
      {
        learningPace: 'MODERATE',
        priorExperienceSummary: 'Knows basic HTML, CSS and foundational JavaScript.',
      },
      tokenA
    );
    assert(roadmapRes.status === 201 && roadmapRes.data.data?.roadmap?._id, 'Roadmap: Generated for User A');
    const roadmapIdA = roadmapRes.data.data.roadmap._id;
    const milestonesA = roadmapRes.data.data.roadmap.milestones || [];
    assert(milestonesA.length > 0, 'Roadmap: User A roadmap contains initial persistent milestones');
    const targetMilestoneA = milestonesA[0];

    // ------------------------------------------------------------------
    // STEP 4: MULTI-TENANT ISOLATION TESTS
    // ------------------------------------------------------------------
    console.log('\n🛡️ [4] Multi-Tenant Isolation & Ownership Verification:');

    // User B tries to query assistant using User A's roadmap
    const crossTenantQuery = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapIdA,
        actionType: 'EXPLAIN_CONCEPT',
        query: 'What is this?',
      },
      tokenB
    );
    assert(
      crossTenantQuery.status === 404 || crossTenantQuery.status === 403,
      'Multi-Tenancy: User B cannot query AI Coach on User A roadmap (Rejected 404/403)'
    );

    // User B tries to retrieve User A's assistant conversation
    const crossTenantGetConv = await request(`/assistant/conversation/${roadmapIdA}`, 'GET', null, tokenB);
    assert(
      crossTenantGetConv.status === 404 || crossTenantGetConv.status === 403,
      'Multi-Tenancy: User B cannot retrieve User A conversation history (Rejected 404/403)'
    );

    // User B tries to clear User A's assistant conversation
    const crossTenantDeleteConv = await request(`/assistant/conversation/${roadmapIdA}`, 'DELETE', null, tokenB);
    assert(
      crossTenantDeleteConv.status === 404 || crossTenantDeleteConv.status === 403,
      'Multi-Tenancy: User B cannot clear User A conversation history (Rejected 404/403)'
    );

    // ------------------------------------------------------------------
    // STEP 5: CONTEXTUAL AI ASSISTANT ACTIONS (USER A)
    // ------------------------------------------------------------------
    console.log('\n💬 [5] Contextual AI Learning Coach Action Types:');

    // Action 1: Explain Concept
    const explainRes = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapIdA,
        milestoneId: targetMilestoneA?.milestoneId,
        actionType: 'EXPLAIN_CONCEPT',
      },
      tokenA
    );
    if (explainRes.status !== 200) {
      console.error('DEBUG explainRes:', explainRes.status, JSON.stringify(explainRes.data));
    }
    assert(explainRes.status === 200 && explainRes.data?.data?.content, 'Action: EXPLAIN_CONCEPT returns contextual learning explanation');
    assert(explainRes.data?.data?.actionType === 'EXPLAIN_CONCEPT', 'Action: Response retains EXPLAIN_CONCEPT actionType');

    // Action 2: Guide Milestone
    const guideRes = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapIdA,
        milestoneId: targetMilestoneA?.milestoneId,
        actionType: 'GUIDE_MILESTONE',
      },
      tokenA
    );
    assert(guideRes.status === 200 && guideRes.data.data?.content, 'Action: GUIDE_MILESTONE returns practical completion guidance');

    // Action 3: Practice Exercise (with progressive hints)
    const exerciseRes = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapIdA,
        milestoneId: targetMilestoneA?.milestoneId,
        actionType: 'PRACTICE_EXERCISE',
      },
      tokenA
    );
    assert(exerciseRes.status === 200, 'Action: PRACTICE_EXERCISE returns 200');
    const exerciseData = exerciseRes.data.data?.structuredData?.exercise || exerciseRes.data.data?.structuredData;
    assert(
      exerciseData && exerciseData.title && exerciseData.instructions && Array.isArray(exerciseData.hints),
      'Action: Structured exercise contains title, instructions, and progressive hints array'
    );

    // Action 4: Knowledge Check Quiz
    const quizRes = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapIdA,
        milestoneId: targetMilestoneA?.milestoneId,
        actionType: 'KNOWLEDGE_CHECK',
      },
      tokenA
    );
    assert(quizRes.status === 200, 'Action: KNOWLEDGE_CHECK returns 200');
    const quizQuestions = quizRes.data.data?.structuredData?.quiz?.questions || quizRes.data.data?.structuredData?.questions;
    assert(
      Array.isArray(quizQuestions) && quizQuestions.length >= 1 && quizQuestions[0].options,
      'Action: Structured quiz contains questions with selectable options'
    );

    // Action 5: Peer Prep
    const peerRes = await request(
      '/assistant/query',
      'POST',
      {
        roadmapId: roadmapIdA,
        milestoneId: targetMilestoneA?.milestoneId,
        actionType: 'PEER_PREP',
      },
      tokenA
    );
    assert(peerRes.status === 200 && peerRes.data.data?.content, 'Action: PEER_PREP returns peer session questions');

    // ------------------------------------------------------------------
    // STEP 6: KNOWLEDGE CHECK ANSWER EVALUATION
    // ------------------------------------------------------------------
    console.log('\n📝 [6] Live Knowledge Check Answer Evaluation:');

    // Test correct answer submission
    const evalCorrect = await request(
      '/assistant/evaluate',
      'POST',
      {
        questionId: 'q_test_1',
        selectedAnswer: 'B',
        correctAnswer: 'B',
        explanation: 'Option B correctly identifies the container execution model.',
      },
      tokenA
    );
    assert(
      evalCorrect.status === 200 && evalCorrect.data.data?.isCorrect === true,
      'Answer Eval: Correct answer returns isCorrect: true'
    );
    assert(
      evalCorrect.data.data.feedback.toLowerCase().includes('correct') || evalCorrect.data.data.explanation,
      'Answer Eval: Feedback provides educational explanation'
    );

    // Test incorrect answer submission
    const evalIncorrect = await request(
      '/assistant/evaluate',
      'POST',
      {
        questionId: 'q_test_2',
        selectedAnswer: 'A',
        correctAnswer: 'C',
        explanation: 'Option C is the actual command; A is a deprecated parameter.',
      },
      tokenA
    );
    assert(
      evalIncorrect.status === 200 && evalIncorrect.data.data?.isCorrect === false,
      'Answer Eval: Incorrect answer returns isCorrect: false'
    );
    assert(
      evalIncorrect.data.data.correctAnswer === 'C',
      'Answer Eval: Reveals correct option and pedagogical explanation'
    );

    // ------------------------------------------------------------------
    // STEP 7: CONVERSATION PERSISTENCE & RESET
    // ------------------------------------------------------------------
    console.log('\n💾 [7] Conversation Persistence & Reset:');

    const convRes = await request(`/assistant/conversation/${roadmapIdA}`, 'GET', null, tokenA);
    assert(
      convRes.status === 200 && Array.isArray(convRes.data.data?.messages) && convRes.data.data.messages.length >= 2,
      'Persistence: User A assistant messages are persisted in database'
    );

    // Clear conversation
    const clearRes = await request(`/assistant/conversation/${roadmapIdA}`, 'DELETE', null, tokenA);
    assert(clearRes.status === 200, 'Reset: User A clears assistant conversation history');

    // Re-verify empty state
    const convAfterClear = await request(`/assistant/conversation/${roadmapIdA}`, 'GET', null, tokenA);
    assert(
      convAfterClear.status === 200 && convAfterClear.data.data?.messages?.length === 0,
      'Reset: Conversation messages array is now empty'
    );

    // ------------------------------------------------------------------
    // STEP 8: CURATED RESOURCES API & BOOKMARKING
    // ------------------------------------------------------------------
    console.log('\n📚 [8] Curated Resources API, Bookmarks & Ratings:');

    // Retrieve resources
    const allResourcesRes = await request('/resources', 'GET', null, tokenA);
    assert(
      allResourcesRes.status === 200 && Array.isArray(allResourcesRes.data.data?.resources) && allResourcesRes.data.data.resources.length > 0,
      'Resources: Retrieves curated educational library'
    );
    const sampleResource = allResourcesRes.data.data.resources[0];

    // Filter by skill
    const reactResourcesRes = await request('/resources?skillName=React', 'GET', null, tokenA);
    assert(
      reactResourcesRes.status === 200 && reactResourcesRes.data.data.resources.every((r) => r.skillName.toLowerCase().includes('react')),
      'Resources: Correctly filters library by skillName'
    );

    // User A bookmarks resource
    const bookmarkRes = await request(`/resources/${sampleResource.resourceId}/bookmark`, 'POST', null, tokenA);
    assert(
      bookmarkRes.status === 200 && bookmarkRes.data.data?.isBookmarked === true,
      'Bookmarks: User A bookmarks resource'
    );

    // Retrieve User A bookmarks
    const userABookmarksRes = await request('/resources/bookmarked', 'GET', null, tokenA);
    assert(
      userABookmarksRes.status === 200 &&
        userABookmarksRes.data.data.resources.some((r) => r.resourceId === sampleResource.resourceId),
      'Bookmarks: User A bookmarked resources list contains saved item'
    );

    // User B bookmarks list should NOT contain User A's bookmark
    const userBBookmarksRes = await request('/resources/bookmarked', 'GET', null, tokenB);
    assert(
      userBBookmarksRes.status === 200 &&
        userBBookmarksRes.data.data.resources.every((r) => r.resourceId !== sampleResource.resourceId),
      'Isolation: User B bookmarked list does NOT contain User A bookmark'
    );

    // User A rates resource useful
    const rateRes = await request(`/resources/${sampleResource.resourceId}/rate`, 'POST', { isUseful: true }, tokenA);
    assert(
      rateRes.status === 200 && rateRes.data.data?.userRating === true && rateRes.data.data.usefulCount >= 1,
      'Ratings: User A rates resource helpful'
    );

    // User A toggles bookmark off
    const unbookmarkRes = await request(`/resources/${sampleResource.resourceId}/bookmark`, 'POST', null, tokenA);
    assert(
      unbookmarkRes.status === 200 && unbookmarkRes.data.data?.isBookmarked === false,
      'Bookmarks: User A un-bookmarks resource'
    );

  } catch (err) {
    console.error('Fatal error in assistantIntegration test:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`🏁 ASSISTANT & RESOURCE INTEGRATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAssistantIntegrationSuite();
