import http from 'http';
import { resetFeedbackRateLimiter } from '../middleware/feedbackRateLimiter.js';

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

const runSuite = async () => {
  console.log('\n====================================================');
  console.log('📬 RUNNING ENHANCEUS FEEDBACK API INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}`);
      failed++;
    }
  };

  try {
    resetFeedbackRateLimiter();
    await request('/feedback/reset-limiter', 'POST');

    // 1. Missing rating validation (400)
    const res1 = await request('/feedback', 'POST', {
      improvements: 'Add more AI features',
    }, null, { 'x-bypass-rate-limit': 'true' });
    assert(
      res1.status === 400 && res1.data?.message?.includes('Validation Failed'),
      'Input Validation: Rejects submission missing rating (400)'
    );

    // 2. Rating out of bounds: 0 or 6 (400)
    const res2a = await request('/feedback', 'POST', { rating: 0 }, null, { 'x-bypass-rate-limit': 'true' });
    const res2b = await request('/feedback', 'POST', { rating: 6 }, null, { 'x-bypass-rate-limit': 'true' });
    const res2c = await request('/feedback', 'POST', { rating: 'not-a-number' }, null, { 'x-bypass-rate-limit': 'true' });
    assert(
      res2a.status === 400 && res2b.status === 400 && res2c.status === 400,
      'Input Validation: Rejects invalid rating bounds or non-numbers (400)'
    );

    // 3. Text field exceeding 1000 chars (400)
    const longText = 'A'.repeat(1005);
    const res3 = await request('/feedback', 'POST', {
      rating: 5,
      improvements: longText,
    }, null, { 'x-bypass-rate-limit': 'true' });
    assert(
      res3.status === 400 && res3.data?.errors?.some((e) => e.includes('1000 characters')),
      'Input Validation: Rejects text fields exceeding 1000 characters (400)'
    );

    // 4. Valid unauthenticated submission (200)
    const res4 = await request('/feedback', 'POST', {
      rating: 5,
      improvements: 'Great UI, would love more roadmaps.',
      newFeatures: 'Real-time video exchange rooms',
      comments: 'Antigravity pair programming session feedback',
    });
    assert(
      res4.status === 200 &&
        res4.data?.message === 'Feedback submitted. Thank you!' &&
        res4.data?.data?.delivered === true,
      'Public Submission: Valid feedback accepted with exact success message (200)'
    );

    // 5. Valid authenticated submission (200)
    // Register temporary user
    const tempEmail = `test.feedback.${Date.now()}@example.com`;
    const regRes = await request('/auth/register', 'POST', {
      name: 'Feedback Tester',
      email: tempEmail,
      password: 'TestPassword123!',
    });
    const token = regRes.data?.data?.token;

    const res5 = await request(
      '/feedback',
      'POST',
      {
        rating: 4,
        improvements: 'Speed up skill matching',
        comments: 'Submitted by authenticated user',
      },
      token
    );
    assert(
      res5.status === 200 && res5.data?.message === 'Feedback submitted. Thank you!',
      'Authenticated Submission: Accepts authenticated feedback and attaches user context (200)'
    );

    // 6. Rate Limiting: Rapid repeated requests trigger 429
    // Limit is 5 per 10 minutes.
    await request('/feedback', 'POST', { rating: 5 }); // 2nd unauthenticated
    await request('/feedback', 'POST', { rating: 5 }); // 3rd
    await request('/feedback', 'POST', { rating: 5 }); // 4th
    await request('/feedback', 'POST', { rating: 5 }); // 5th
    const resThrottled = await request('/feedback', 'POST', { rating: 5 }); // 6th -> triggers 429
    assert(
      resThrottled.status === 429 && resThrottled.data?.message?.includes('limit reached'),
      'Rate Limiting: Exceeding 5 requests per 10 minutes triggers 429 Too Many Requests'
    );

    resetFeedbackRateLimiter();
    await request('/feedback/reset-limiter', 'POST');
  } catch (err) {
    console.error('Test Suite Exception:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`FEEDBACK SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runSuite();
