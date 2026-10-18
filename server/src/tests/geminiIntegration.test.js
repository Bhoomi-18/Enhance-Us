import http from 'http';
import { GeminiGoalAnalysisProvider } from '../services/geminiGoalAnalysisProvider.js';
import { goalAnalysisService } from '../services/goalAnalysisService.js';
import { calculateSkillGaps } from '../services/skillGapEngine.js';

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

async function runGeminiIntegrationSuite() {
  console.log('====================================================');
  console.log('🤖 RUNNING ENHANCEUS GEMINI AI INTEGRATION TEST SUITE');
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
    const userEmail = `gemini_tester_${timestamp}@enhanceus.org`;
    const password = 'TestPassword123!';

    // Register User with profile skills
    const regRes = await request('/auth/register', 'POST', {
      name: 'Gemini Tester',
      email: userEmail,
      password,
      skills: [
        { name: 'React', category: 'Frontend', level: 'ADVANCED' },
        { name: 'JavaScript / TypeScript', category: 'Programming Languages', level: 'INTERMEDIATE' },
      ],
    });

    assert(regRes.status === 201 && regRes.data.data?.token, 'User Registration with Profile Skills');
    const token = regRes.data.data?.token;
    const userId = regRes.data.data?.user?._id;

    // Test 1: Unauthenticated access rejected
    const unauthRes = await request('/goals/analyze', 'POST', {
      description: 'I want to build a mobile app with React Native and Node.',
    });
    assert(unauthRes.status === 401, 'Unauthenticated Access Blocked on /api/goals/analyze (401)');

    await sleep(50);

    // Test 2: Invalid input - description too short (<10 chars)
    const shortRes = await request('/goals/analyze', 'POST', {
      description: 'Make app',
    }, token);
    assert(
      shortRes.status === 400 && shortRes.data.message?.toLowerCase().includes('validation'),
      'Input Validation: Rejects description under 10 characters (400)'
    );

    await sleep(50);

    // Test 3: Invalid input - description too long (>2000 chars)
    const longDescription = 'Build mobile app ' + 'x'.repeat(2005);
    const longRes = await request('/goals/analyze', 'POST', {
      description: longDescription,
    }, token);
    assert(
      longRes.status === 400,
      'Input Validation: Rejects description exceeding 2000 characters (400)'
    );

    await sleep(50);

    // Test 4: Goal Decomposition Preview API returns structured AI roadmap and skill gaps
    const analyzeRes = await request('/goals/analyze', 'POST', {
      title: 'Build AI-powered Mobile Health App',
      description: 'I want to develop a cross-platform mobile health tracking app using React Native and Python backend.',
    }, token);

    assert(
      analyzeRes.status === 200 &&
      analyzeRes.data.data?.analysis &&
      Array.isArray(analyzeRes.data.data.analysis.requiredSkills) &&
      analyzeRes.data.data.analysis.aiAnalysis !== undefined &&
      analyzeRes.data.data.analysis.skillGaps !== undefined,
      'Goal Decomposition API: Returns structured skills, AI roadmap & skill gaps'
    );

    const analysisData = analyzeRes.data.data?.analysis || {};

    // Test 5: Deterministic skill gap calculation with real user profile skills
    // User already has React in profile; React should be in knownSkills, missing skills should be identified
    assert(
      analysisData.skillGaps?.knownSkills?.some((k) => k.name.toLowerCase().includes('react')),
      'Deterministic Skill Gap: User profile skill (React) correctly identified in knownSkills'
    );

    assert(
      typeof analysisData.progress === 'number' && analysisData.progress >= 0 && analysisData.progress <= 100,
      'Skill Gap Engine: Progress percentage calculated deterministically (0-100)'
    );

    await sleep(50);

    // Test 6: Goal Creation persists AI analysis and enforces user ownership
    const createGoalRes = await request('/goals', 'POST', {
      title: 'Build AI-powered Mobile Health App',
      description: 'I want to develop a cross-platform mobile health tracking app using React Native and Python backend.',
    }, token);

    assert(
      createGoalRes.status === 201 &&
      createGoalRes.data.data?.goal?._id &&
      createGoalRes.data.data?.goal?.user === userId,
      'Goal Creation: Scoped to authenticated user ID with AI roadmap stored'
    );

    const savedGoalId = createGoalRes.data.data?.goal?._id;

    // Test 7: Rate Limiter enforcement (rapid successive requests)
    let rateLimitHit = false;
    for (let i = 0; i < 12; i++) {
      const rapidRes = await request('/goals/analyze', 'POST', {
        description: `Rapid stress test goal description #${i + 1} for AI analysis.`,
      }, token);
      if (rapidRes.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
    assert(rateLimitHit, 'AI Rate Limiter: Rapid requests throttle with 429 Too Many Requests');

    // Test 8: Provider unit test - Malformed JSON handling & sanitization
    const provider = new GeminiGoalAnalysisProvider();
    let malformedHandled = false;
    try {
      provider.parseAndValidateResponse('INVALID NON-JSON RESPONSE', 'Test description');
    } catch (e) {
      malformedHandled = e.statusCode === 502;
    }
    assert(malformedHandled, 'Provider Error Handling: Malformed model response safely handled (502)');

    // Test 9: Provider unit test - HTML stripping & sanitization
    const mockModelOutput = JSON.stringify({
      goalInterpretation: 'Safe <script>alert("hack")</script> interpretation',
      skills: [
        {
          name: 'React <b>Native</b>',
          category: 'Mobile Development',
          level: 'ADVANCED',
          importance: 'HIGH',
          explanation: 'Build mobile <script>evil()</script> interfaces',
          learningOrder: 1,
          prerequisites: ['JavaScript'],
        },
      ],
      milestones: [{ title: 'M1', description: 'Setup', targetTimeline: 'W1' }],
      estimatedEffort: { estimatedHours: '40 hrs', timelineRecommendation: '4 wks', uncertaintyDisclaimer: 'Estimate' },
      assumptions: ['Basic programming knowledge'],
    });

    const sanitizedResult = provider.parseAndValidateResponse(mockModelOutput, 'Build app');
    assert(
      !sanitizedResult.aiAnalysis.goalInterpretation.includes('<script>') &&
      !sanitizedResult.aiAnalysis.skills[0].name.includes('<b>'),
      'Security & Sanitization: Model output HTML/scripts stripped cleanly'
    );

    // Test 10: No sensitive credentials or secrets leaked in API responses
    const responseString = JSON.stringify(analyzeRes.data) + JSON.stringify(createGoalRes.data);
    const hasSecretLeak =
      responseString.includes('AIza') ||
      responseString.includes('password') ||
      responseString.includes('mongodb+srv');
    assert(!hasSecretLeak, 'Security & Privacy: Zero secret/credential leakage in API responses');

    // Test 11: Existing regression test - Fetching goal details returns full matrix & roadmap
    const getGoalRes = await request(`/goals/${savedGoalId}`, 'GET', null, token);
    assert(
      getGoalRes.status === 200 &&
      getGoalRes.data.data?.goal?.title === 'Build AI-powered Mobile Health App' &&
      getGoalRes.data.data?.goal?.requiredSkills?.length > 0,
      'Regression Check: Goal detail endpoint returns complete blueprint & required skills'
    );

    console.log('\n====================================================');
    console.log(`GEMINI SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Gemini test execution failed:', err);
    process.exit(1);
  }
}

runGeminiIntegrationSuite();
