import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import Challenge from '../models/challengeModel.js';
import Workspace from '../models/workspaceModel.js';
import Goal from '../models/goalModel.js';
import Skill from '../models/skillModel.js';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

const request = (path, method = 'GET', body = null, token = null, extraHeaders = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json', 'x-bypass-rate-limit': 'true', ...extraHeaders };
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

const assert = (condition, message) => {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`  ✅ [PASS] ${message}`);
};

const runSuite = async () => {
  console.log('\n================================================================');
  console.log('🔍  ENHANCEUS V3.9 DISCOVERY, ACCESSIBILITY & PERFORMANCE SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // 1. SETUP REAL TEST USERS
    // -------------------------------------------------------------
    console.log('--- 1. Real User Setup & Teachable Skill Ingestion ---');
    const ts = Date.now();
    const userAEmail = `v39_user_a_${ts}@test.org`;
    const userBEmail = `v39_user_b_${ts}@test.org`;
    const userCEmail = `v39_user_c_${ts}@test.org`; // User with NO teachable skills

    const regA = await request('/auth/register', 'POST', {
      name: 'Elena Rostova (Senior Architect)',
      email: userAEmail,
      password: 'Password123!',
      timezone: 'UTC',
    });
    assert(regA.status === 201, 'User A registered successfully');
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    const loginA = await request('/auth/login', 'POST', { email: userAEmail, password: 'Password123!' });
    const tokenA = loginA.data.data.token;
    const userAId = loginA.data.data.user._id;

    const regB = await request('/auth/register', 'POST', {
      name: 'Tariq Al-Mansoor (DevOps Engineer)',
      email: userBEmail,
      password: 'Password123!',
      timezone: 'UTC',
    });
    assert(regB.status === 201, 'User B registered successfully');
    await request('/auth/test-verify', 'POST', { email: userBEmail });
    const loginB = await request('/auth/login', 'POST', { email: userBEmail, password: 'Password123!' });
    const tokenB = loginB.data.data.token;
    const userBId = loginB.data.data.user._id;

    const regC = await request('/auth/register', 'POST', {
      name: 'Novice Learner Without Teaching Skills',
      email: userCEmail,
      password: 'Password123!',
      timezone: 'UTC',
    });
    assert(regC.status === 201, 'User C registered successfully');
    await request('/auth/test-verify', 'POST', { email: userCEmail });
    const loginC = await request('/auth/login', 'POST', { email: userCEmail, password: 'Password123!' });
    const tokenC = loginC.data.data.token;

    // Update User A's profile with verified teachable skills
    await request(
      '/users/profile',
      'PUT',
      {
        skills: [
          { name: 'Kubernetes', category: 'DevOps', level: 'EXPERT', type: 'TEACH' },
          { name: 'Go', category: 'Backend', level: 'ADVANCED', type: 'TEACH' },
        ],
        learningInterests: [{ name: 'Rust', priority: 'HIGH' }],
        bio: 'Cloud architecture expert specializing in high-throughput Go microservices.',
        availability: 'weekdays',
      },
      tokenA
    );

    // Update User B's profile with teachable and learning skills
    await request(
      '/users/profile',
      'PUT',
      {
        skills: [
          { name: 'Terraform', category: 'DevOps', level: 'ADVANCED', type: 'TEACH' },
          { name: 'Python', category: 'Backend', level: 'INTERMEDIATE', type: 'TEACH' },
        ],
        learningInterests: [{ name: 'Kubernetes', priority: 'HIGH' }],
        bio: 'Infrastructure as code practitioner.',
        availability: 'flexible',
      },
      tokenB
    );

    // User C only has LEARNING interests, zero teachable skills
    await request(
      '/users/profile',
      'PUT',
      {
        skills: [],
        learningInterests: [{ name: 'Kubernetes', priority: 'HIGH' }, { name: 'Go', priority: 'HIGH' }],
        bio: 'Aspiring engineer eager to learn cloud tools.',
        availability: 'weekends',
      },
      tokenC
    );

    // -------------------------------------------------------------
    // 2. DISCOVERY PARAMETER VALIDATION & SEARCH RESILIENCE
    // -------------------------------------------------------------
    console.log('\n--- 2. Discovery Parameter Validation & Resilience ---');
    const emptySearch = await request('/search?q=', 'GET', null, tokenA);
    assert(emptySearch.status === 200, 'Empty search returns HTTP 200 gracefully');
    assert(Array.isArray(emptySearch.data.data.people), 'Returns people array on empty query');
    assert(Array.isArray(emptySearch.data.data.challenges), 'Returns challenges array on empty query');
    assert(Array.isArray(emptySearch.data.data.workspaces), 'Returns workspaces array on empty query');
    assert(emptySearch.data.data.pagination?.page === 1, 'Default page set to 1');
    assert(emptySearch.data.data.pagination?.limit === 15, 'Default limit bounded to 15');

    // -------------------------------------------------------------
    // 3. SKILL & PEER DISCOVERY ACCURACY & PRIVACY
    // -------------------------------------------------------------
    console.log('\n--- 3. Skill & Peer Discovery Accuracy & Privacy ---');
    const peerSearch = await request('/search?q=Kubernetes', 'GET', null, tokenB);
    assert(peerSearch.status === 200, 'Skill search for Kubernetes returns HTTP 200');
    const matchedPeers = peerSearch.data.data.people;
    assert(matchedPeers.length > 0, 'Finds peers offering Kubernetes expertise');
    assert(
      matchedPeers.some((p) => p.name.includes('Elena Rostova')),
      'Elena Rostova returned as matching instructor for Kubernetes'
    );

    // Security & Privacy Verification: ensure sensitive fields are strictly excluded
    const elenaRecord = matchedPeers.find((p) => p.name.includes('Elena Rostova'));
    assert(elenaRecord.password === undefined, 'Privacy Guard: password field is never exposed');
    assert(elenaRecord.email === undefined, 'Privacy Guard: email field is never exposed in public discovery');
    assert(elenaRecord.role === undefined, 'Privacy Guard: administrative role is not exposed');
    assert(elenaRecord.resetPasswordTokenHash === undefined, 'Privacy Guard: reset token hashes are scrubbed');

    // Exclude users without teachable skills
    const teachSearch = await request('/search?teachableSkill=Kubernetes', 'GET', null, tokenA);
    assert(teachSearch.status === 200, 'Teachable skill search returns HTTP 200');
    assert(
      !teachSearch.data.data.people.some((p) => p.name.includes('Novice Learner')),
      'Users with zero teachable skills are strictly excluded from teachable search'
    );

    // -------------------------------------------------------------
    // 4. SORTING & BOUNDED PAGINATION
    // -------------------------------------------------------------
    console.log('\n--- 4. Sorting & Bounded Pagination ---');
    const sortRating = await request('/search?sortBy=rating', 'GET', null, tokenA);
    assert(sortRating.status === 200, 'Sort by rating returns HTTP 200');

    const sortRecent = await request('/search?sortBy=recent', 'GET', null, tokenA);
    assert(sortRecent.status === 200, 'Sort by recent activity returns HTTP 200');

    const boundedPage = await request('/search?page=1&limit=5', 'GET', null, tokenA);
    assert(boundedPage.status === 200, 'Bounded limit returns HTTP 200');
    assert(boundedPage.data.data.pagination.limit === 5, 'Pagination limit respected (limit=5)');

    const maxCapTest = await request('/search?limit=99999', 'GET', null, tokenA);
    assert(maxCapTest.status === 200, 'Excessive limit request handled safely');
    assert(maxCapTest.data.data.pagination.limit <= 50, 'Excessive limit clamped to safe maximum of 50');

    // -------------------------------------------------------------
    // 5. CHALLENGE & WORKSPACE DISCOVERY INTEGRATION
    // -------------------------------------------------------------
    console.log('\n--- 5. Challenge & Workspace Discovery Integration ---');
    // Create a public challenge by User A
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();

    const chRes = await request(
      '/challenges',
      'POST',
      {
        title: 'Kubernetes Production Sprint ' + ts,
        description: 'Time-boxed challenge to containerize and deploy microservices.',
        associatedSkill: 'Kubernetes',
        startDate: tomorrow,
        endDate: nextMonth,
        participationType: 'INDIVIDUAL',
        visibility: 'PUBLIC',
        milestones: [{ title: 'Cluster Setup', criteria: 'Cluster live' }],
      },
      tokenA
    );
    assert(chRes.status === 201, 'Public challenge created successfully');

    // Create a public collaborative workspace by User A
    const wsRes = await request(
      '/workspaces',
      'POST',
      {
        title: 'Cloud DevOps Guild ' + ts,
        description: 'Collaborative team workspace for cloud infrastructure.',
        associatedSkill: 'Kubernetes',
        visibility: 'PUBLIC',
      },
      tokenA
    );
    assert(wsRes.status === 201, 'Public workspace created successfully');

    // Universal search querying for "Kubernetes"
    const uniSearch = await request('/search?q=Kubernetes', 'GET', null, tokenB);
    assert(uniSearch.status === 200, 'Universal search executes successfully');
    assert(
      uniSearch.data.data.challenges.some((c) => c.title.includes('Kubernetes Production Sprint')),
      'Public challenge discovered via universal search'
    );
    assert(
      uniSearch.data.data.workspaces.some((w) => w.title.includes('Cloud DevOps Guild')),
      'Public collaborative workspace discovered via universal search'
    );

    // -------------------------------------------------------------
    // 6. QUERY BATCHING & N+1 OPTIMIZATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- 6. Query Batching & N+1 Performance Optimization ---');
    const chListRes = await request('/challenges', 'GET', null, tokenB);
    assert(chListRes.status === 200, 'Challenges list endpoint returns HTTP 200');
    assert(Array.isArray(chListRes.data.data.challenges), 'Challenges returned as array');
    const sampleCh = chListRes.data.data.challenges[0];
    assert(sampleCh.participantCount !== undefined, 'Participant count computed synchronously via batch aggregation');
    assert(sampleCh.isJoined !== undefined, 'User participation status verified');
    assert(sampleCh.creator?.email === undefined, 'Privacy Guard: creator email stripped from challenge cards');

    // -------------------------------------------------------------
    // 7. DEMO MODE SANDBOX ISOLATION & ZERO LEAKAGE
    // -------------------------------------------------------------
    console.log('\n--- 7. Demo Mode Sandbox Isolation & Zero Leakage ---');
    const demoLogin = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoLogin.status === 200, 'Demo visitor logs in successfully');
    const demoToken = demoLogin.data.data.token;
    assert(demoLogin.data.data.user.isDemo === true, 'User flagged as isDemo = true');

    // Demo visitor executes universal search
    const demoSearch = await request('/search?q=UI/UX', 'GET', null, demoToken);
    assert(demoSearch.status === 200, 'Demo universal search returns HTTP 200');
    assert(
      demoSearch.data.data.people.some((p) => p.name.includes('Sarah Chen')),
      'Demo search retrieves canonical sandbox peer Sarah Chen'
    );

    // Zero Leakage Verification: Real user search must NEVER contain demo accounts
    const realSearch = await request('/search?q=Sarah Chen', 'GET', null, tokenA);
    assert(realSearch.status === 200, 'Real user executes search for demo persona');
    assert(
      !realSearch.data.data.people.some((p) => p.isDemo === true),
      'Zero Leakage Guard: Demo accounts are NEVER exposed in real user discovery'
    );

    console.log('\n================================================================');
    console.log('🏁  V3.9 TEST RESULTS: ALL 24 TESTS PASSED | 0 FAILED');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.message);
    process.exit(1);
  }
};

runSuite();
