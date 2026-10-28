import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import Challenge from '../models/challengeModel.js';
import ChallengeParticipation from '../models/challengeParticipationModel.js';
import ChallengeUpdate from '../models/challengeUpdateModel.js';
import UserAchievement, { ACHIEVEMENT_DEFINITIONS } from '../models/userAchievementModel.js';
import Workspace from '../models/workspaceModel.js';
import Report from '../models/reportModel.js';
import DemoWorkspace from '../models/demoWorkspaceModel.js';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../services/authService.js';
import { validateHttpUrl } from '../services/skillEvidenceService.js';

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

const getData = (res) => res?.data?.data || res?.data;

async function runV38CommunityChallengesSuite() {
  console.log('================================================================');
  console.log('🏆  ENHANCEUS V3.8 COMMUNITY CHALLENGES & COLLABORATION SUITE');
  console.log('================================================================\n');

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

  const cleanups = [];

  try {
    // 0. Connect DB for direct test setup & isolation verification
    if (mongoose.connection.readyState === 0) {
      const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/enhanceus';
      await mongoose.connect(uri);
    }

    // 1. Evidence URL Security Validation
    console.log('\n--- 1. HTTP/HTTPS URL Security Validation ---');
    assert(validateHttpUrl('https://github.com/org/repo') === 'https://github.com/org/repo', 'Accepts valid HTTPS URL');
    assert(validateHttpUrl('http://docs.dev/api') === 'http://docs.dev/api', 'Accepts valid HTTP URL');

    let threwXss = false;
    try { validateHttpUrl('javascript:alert(document.cookie)'); } catch (e) { threwXss = true; }
    assert(threwXss, 'Rejects javascript: XSS pseudo-protocol in evidence URL');

    // 2. Real User Setup
    console.log('\n--- 2. Real User Setup & Verification ---');
    const timestamp = Date.now();
    const userAEmail = `v38_creator_${timestamp}@test.org`;
    const userBEmail = `v38_member_${timestamp}@test.org`;
    const userCEmail = `v38_stranger_${timestamp}@test.org`;

    // Register User A (Challenge Creator & Workspace Owner)
    const resA = await request('/auth/register', 'POST', {
      name: 'Alice Creator',
      email: userAEmail,
      password: 'Password123!',
      skillsToTeach: ['React', 'Node.js'],
      skillsToLearn: ['Docker'],
    });
    assert(resA.status === 201, 'User A registered successfully');
    cleanups.push(() => User.deleteOne({ email: userAEmail }));
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    const loginA = await request('/auth/login', 'POST', { email: userAEmail, password: 'Password123!' });
    const dataA = getData(loginA);
    const tokenA = dataA.token;
    const userAId = (dataA.user?._id || dataA.user?.id).toString();

    // Register User B (Collaborative Team Member)
    const resB = await request('/auth/register', 'POST', {
      name: 'Bob Member',
      email: userBEmail,
      password: 'Password123!',
      skillsToTeach: ['Docker'],
      skillsToLearn: ['React'],
    });
    assert(resB.status === 201, 'User B registered successfully');
    cleanups.push(() => User.deleteOne({ email: userBEmail }));
    await request('/auth/test-verify', 'POST', { email: userBEmail });
    const loginB = await request('/auth/login', 'POST', { email: userBEmail, password: 'Password123!' });
    const dataB = getData(loginB);
    const tokenB = dataB.token;
    const userBId = (dataB.user?._id || dataB.user?.id).toString();

    // Register User C (Stranger)
    const resC = await request('/auth/register', 'POST', {
      name: 'Charlie Stranger',
      email: userCEmail,
      password: 'Password123!',
      skillsToTeach: ['Python'],
      skillsToLearn: ['Go'],
    });
    assert(resC.status === 201, 'User C registered successfully');
    cleanups.push(() => User.deleteOne({ email: userCEmail }));
    await request('/auth/test-verify', 'POST', { email: userCEmail });
    const loginC = await request('/auth/login', 'POST', { email: userCEmail, password: 'Password123!' });
    const dataC = getData(loginC);
    const tokenC = dataC.token;
    const userCId = (dataC.user?._id || dataC.user?.id).toString();

    // 3. Challenge Creation & Input Validation
    console.log('\n--- 3. Challenge Creation & Input Validation ---');
    const now = new Date();
    const inTenDays = new Date(now.getTime() + 10 * 86400000);
    const inThirtyDays = new Date(now.getTime() + 30 * 86400000);

    // Date validation: End date before start date
    const invalidDateRes = await request('/challenges', 'POST', {
      title: 'Invalid Date Challenge',
      description: 'This challenge has start date after end date.',
      associatedSkill: 'React',
      startDate: inThirtyDays.toISOString(),
      endDate: inTenDays.toISOString(),
    }, tokenA);
    assert(invalidDateRes.status === 400, 'Rejects inverted challenge schedule (start date >= end date)');

    // Title length validation
    const invalidTitleRes = await request('/challenges', 'POST', {
      title: 'Hi',
      description: 'Valid description for testing title length.',
      associatedSkill: 'React',
      startDate: inTenDays.toISOString(),
      endDate: inThirtyDays.toISOString(),
    }, tokenA);
    assert(invalidTitleRes.status === 400, 'Rejects challenge title with less than 3 characters');

    // Valid Individual Challenge Creation
    const validChRes = await request('/challenges', 'POST', {
      title: 'Full-Stack Performance Sprint',
      description: 'Optimize web performance metrics and deliver sub-second LCP scores.',
      associatedSkill: 'Performance Optimization',
      associatedGoalTitle: 'Master Core Web Vitals',
      startDate: new Date(now.getTime() - 86400000).toISOString(), // started yesterday -> ACTIVE
      endDate: inThirtyDays.toISOString(),
      participationType: 'INDIVIDUAL',
      visibility: 'PUBLIC',
      capacity: 5,
      milestones: [
        { title: 'Lighthouse Audit & Bottlenecks', description: 'Analyze performance audit', criteria: 'Lighthouse JSON export' },
        { title: 'Bundle Optimization & Tree Shaking', description: 'Cut bundle size by 30%', criteria: 'Webpack/Vite analyzer chart' },
      ],
      rules: ['Share benchmark screenshots', 'Open source code only'],
    }, tokenA);

    assert(validChRes.status === 201, 'Creates valid community challenge (HTTP 201)');
    const challengeA = validChRes.data?.data?.challenge || validChRes.data?.challenge;
    assert(challengeA?.title === 'Full-Stack Performance Sprint', 'Challenge title matches');
    assert(challengeA?.status === 'ACTIVE', 'Lifecycle status correctly derived as ACTIVE');
    assert(challengeA?.milestones?.length === 2, 'Two deliverable milestones persisted');
    cleanups.push(() => Challenge.deleteOne({ _id: challengeA._id }));

    // 4. Discovery & Filtering
    console.log('\n--- 4. Challenge Discovery & Filtering ---');
    const discRes = await request('/challenges?skill=Performance', 'GET');
    assert(discRes.status === 200, 'Discovery endpoint returns HTTP 200');
    const discChallenges = discRes.data?.data?.challenges || discRes.data?.challenges;
    assert(Array.isArray(discChallenges) && discChallenges.length >= 1, 'Returns matching challenges for skill filter');
    const foundCh = discChallenges.find((c) => c._id === challengeA._id);
    assert(foundCh && foundCh.participantCount === 0, 'Participant count dynamically computed as 0');

    // 5. Authorization & Modification Protection
    console.log('\n--- 5. Challenge Authorization & Edit Protection ---');
    // Stranger tries to update challenge
    const strangerEditRes = await request(`/challenges/${challengeA._id}`, 'PUT', {
      title: 'Hacked Title By Stranger',
    }, tokenC);
    assert(strangerEditRes.status === 403, 'Rejects update attempt by unauthorized non-creator (HTTP 403)');

    // Creator updates challenge
    const creatorEditRes = await request(`/challenges/${challengeA._id}`, 'PUT', {
      title: 'Full-Stack Performance & Core Web Vitals Sprint',
    }, tokenA);
    assert(creatorEditRes.status === 200, 'Authorized creator successfully updates challenge (HTTP 200)');
    assert(
      (creatorEditRes.data?.data?.challenge || creatorEditRes.data?.challenge)?.title === 'Full-Stack Performance & Core Web Vitals Sprint',
      'Updated title persisted'
    );

    // 6. Individual Participation & Milestone Progress
    console.log('\n--- 6. Individual Participation & Milestone Progress ---');
    // User B joins challenge
    const joinRes = await request(`/challenges/${challengeA._id}/join`, 'POST', {}, tokenB);
    assert(joinRes.status === 200, 'User B joins individual challenge (HTTP 200)');
    cleanups.push(() => ChallengeParticipation.deleteMany({ challenge: challengeA._id }));

    // Prevent duplicate joining
    const dupJoinRes = await request(`/challenges/${challengeA._id}/join`, 'POST', {}, tokenB);
    assert(dupJoinRes.status === 409, 'Rejects duplicate challenge enrollment with HTTP 409');

    // Check achievement: FIRST_CHALLENGE_JOINED
    const achAfterJoin = await request('/challenges/achievements/my', 'GET', null, tokenB);
    const achList = achAfterJoin.data?.data?.achievements || achAfterJoin.data?.achievements || [];
    const joinedAch = achList.find((a) => a.key === 'FIRST_CHALLENGE_JOINED');
    assert(joinedAch && joinedAch.isUnlocked === true, 'FIRST_CHALLENGE_JOINED achievement unlocked for User B');

    // Stranger tries to complete User B's milestone
    const m1 = challengeA.milestones[0];
    const m2 = challengeA.milestones[1];

    const strangerMilestoneRes = await request(
      `/challenges/${challengeA._id}/milestones/${m1._id}/complete`,
      'POST',
      { note: 'Stranger trying to complete' },
      tokenC
    );
    assert(strangerMilestoneRes.status === 403, 'Rejects milestone completion by non-participant (HTTP 403)');

    // User B completes Stage 1
    const completeM1Res = await request(
      `/challenges/${challengeA._id}/milestones/${m1._id}/complete`,
      'POST',
      { note: 'Exported Lighthouse report with 98 mobile performance score' },
      tokenB
    );
    assert(completeM1Res.status === 200, 'User B completes Milestone #1 (HTTP 200)');
    const m1Data = getData(completeM1Res);
    assert(m1Data.progress === 50, 'Progress calculated strictly server-side: 1 of 2 = 50%');
    assert(m1Data.isCompleted === false, 'Challenge not yet marked complete');

    // Duplicate milestone completion rejected
    const dupM1Res = await request(
      `/challenges/${challengeA._id}/milestones/${m1._id}/complete`,
      'POST',
      {},
      tokenB
    );
    assert(dupM1Res.data?.data?.message?.includes('already marked as completed') || dupM1Res.data?.message?.includes('already marked as completed'), 'Handles duplicate milestone completion safely');

    // Check achievement: FIRST_CHALLENGE_MILESTONE
    const achAfterM1 = await request('/challenges/achievements/my', 'GET', null, tokenB);
    const m1Ach = (achAfterM1.data?.data?.achievements || achAfterM1.data?.achievements || []).find((a) => a.key === 'FIRST_CHALLENGE_MILESTONE');
    assert(m1Ach && m1Ach.isUnlocked === true, 'FIRST_CHALLENGE_MILESTONE achievement unlocked for User B');

    // User B completes Stage 2 -> 100% and Challenge Victor
    const completeM2Res = await request(
      `/challenges/${challengeA._id}/milestones/${m2._id}/complete`,
      'POST',
      { note: 'Tree shaking reduced bundle size by 34%' },
      tokenB
    );
    assert(completeM2Res.status === 200, 'User B completes Milestone #2 (HTTP 200)');
    const m2Data = getData(completeM2Res);
    assert(m2Data.progress === 100, 'Progress strictly server-calculated as 100%');
    assert(m2Data.isCompleted === true, 'Challenge marked completed upon reaching all milestones');

    // Check achievement: FIRST_CHALLENGE_COMPLETED
    const achAfterComplete = await request('/challenges/achievements/my', 'GET', null, tokenB);
    const completeAch = (achAfterComplete.data?.data?.achievements || achAfterComplete.data?.achievements || []).find((a) => a.key === 'FIRST_CHALLENGE_COMPLETED');
    assert(completeAch && completeAch.isUnlocked === true, 'FIRST_CHALLENGE_COMPLETED achievement unlocked for User B');

    // Milestone Undo Operation
    const undoRes = await request(
      `/challenges/${challengeA._id}/milestones/${m2._id}/undo`,
      'POST',
      {},
      tokenB
    );
    assert(undoRes.status === 200, 'Milestone completion reverted cleanly via undo endpoint');
    assert(getData(undoRes).progress === 50, 'Progress recalculated to 50% after undo');

    // Re-complete Stage 2
    await request(`/challenges/${challengeA._id}/milestones/${m2._id}/complete`, 'POST', {}, tokenB);

    // 7. Team Challenges & V3.7 Workspace Integration
    console.log('\n--- 7. Team Challenges & V3.7 Workspace Integration ---');
    // User A creates a V3.7 Collaborative Workspace
    const wsRes = await request('/workspaces', 'POST', {
      title: 'DevOps & Microservices Guild',
      description: 'Shared engineering space for distributed systems.',
      associatedSkill: 'Docker',
      visibility: 'PUBLIC',
    }, tokenA);
    assert(wsRes.status === 201, 'V3.7 Workspace created successfully');
    const workspaceObj = wsRes.data?.data?.workspace || wsRes.data?.workspace;
    cleanups.push(() => Workspace.deleteOne({ _id: workspaceObj._id }));

    // User A invites User B to workspace and User B accepts
    await request(`/workspaces/${workspaceObj._id}/invite`, 'POST', { targetUserId: userBId }, tokenA);
    await request(`/workspaces/${workspaceObj._id}/respond`, 'POST', { response: 'ACCEPT' }, tokenB);

    // User A creates a TEAM Community Challenge
    const teamChRes = await request('/challenges', 'POST', {
      title: 'Distributed Event-Driven Architecture Sprint',
      description: 'Team sprint to containerize and scale asynchronous workers.',
      associatedSkill: 'Docker',
      startDate: new Date(now.getTime() - 86400000).toISOString(),
      endDate: inThirtyDays.toISOString(),
      participationType: 'TEAM',
      visibility: 'PUBLIC',
      milestones: [
        { title: 'Cluster Orchestration', description: 'Multi-host docker-compose', criteria: 'Healthchecks green' },
      ],
    }, tokenA);
    assert(teamChRes.status === 201, 'Creates valid TEAM community challenge');
    const teamChallenge = teamChRes.data?.data?.challenge || teamChRes.data?.challenge;
    cleanups.push(() => Challenge.deleteOne({ _id: teamChallenge._id }));

    // Stranger tries to join team challenge without workspace
    const noWsRes = await request(`/challenges/${teamChallenge._id}/join`, 'POST', {}, tokenC);
    assert(noWsRes.status === 400, 'Rejects team challenge enrollment when workspace is omitted');

    // User A enrolls the V3.7 Workspace into the challenge
    const enrollRes = await request(`/challenges/${teamChallenge._id}/join`, 'POST', {
      teamWorkspaceId: workspaceObj._id,
    }, tokenA);
    assert(enrollRes.status === 200, 'Workspace successfully enrolled in team challenge');

    // Workspace Member (User B) completes the team milestone
    const teamM1 = teamChallenge.milestones[0];
    const teamM1Res = await request(
      `/challenges/${teamChallenge._id}/milestones/${teamM1._id}/complete`,
      'POST',
      { note: 'Orchestrated cluster workers with healthchecks' },
      tokenB
    );
    assert(teamM1Res.status === 200, 'Workspace member User B can contribute to team challenge deliverable');
    assert(getData(teamM1Res).progress === 100, 'Team progress strictly server-derived as 100%');

    // Check achievement: FIRST_TEAM_CHALLENGE_COMPLETED
    const achAfterTeam = await request('/challenges/achievements/my', 'GET', null, tokenB);
    const teamAch = (achAfterTeam.data?.data?.achievements || achAfterTeam.data?.achievements || []).find((a) => a.key === 'FIRST_TEAM_CHALLENGE_COMPLETED');
    assert(teamAch && teamAch.isUnlocked === true, 'FIRST_TEAM_CHALLENGE_COMPLETED unlocked for contributing member');

    // 8. Progress Updates & Community Feed
    console.log('\n--- 8. Progress Updates & Activity Feed ---');
    // Post update
    const updateRes = await request(`/challenges/${challengeA._id}/updates`, 'POST', {
      content: 'Shipped dynamic code-splitting and asset compression today!',
      evidenceUrl: 'https://github.com/enhanceus/demo/pull/12',
    }, tokenB);
    assert(updateRes.status === 201, 'Participant posts progress update (HTTP 201)');
    const updateObj = updateRes.data?.data?.update || updateRes.data?.update;
    cleanups.push(() => ChallengeUpdate.deleteMany({ challenge: challengeA._id }));

    // Get updates
    const getUpdatesRes = await request(`/challenges/${challengeA._id}/updates`, 'GET');
    assert(getUpdatesRes.status === 200, 'Updates feed retrieved successfully');
    const updateList = getUpdatesRes.data?.data?.updates || getUpdatesRes.data?.updates;
    assert(Array.isArray(updateList) && updateList.length >= 1, 'Updates feed contains new post');

    // Unauthorized deletion attempt
    const strangerDelRes = await request(
      `/challenges/${challengeA._id}/updates/${updateObj._id}`,
      'DELETE',
      null,
      tokenC
    );
    assert(strangerDelRes.status === 403, 'Rejects update deletion by unauthorized stranger (HTTP 403)');

    // Author deletes update
    const authorDelRes = await request(
      `/challenges/${challengeA._id}/updates/${updateObj._id}`,
      'DELETE',
      null,
      tokenB
    );
    assert(authorDelRes.status === 200, 'Author successfully deletes their progress update');

    // 9. Moderation & Abuse Reporting
    console.log('\n--- 9. Moderation & Abuse Reporting Integration ---');
    const reportRes = await request('/reports', 'POST', {
      targetType: 'CHALLENGE',
      targetId: challengeA._id.toString(),
      category: 'MISLEADING_SKILL_CLAIMS',
      reason: 'Testing challenge content report and moderation pipeline.',
    }, tokenC);
    assert(reportRes.status === 201, 'Submits moderation report on challenge (HTTP 201)');
    cleanups.push(() => Report.deleteMany({ targetId: challengeA._id.toString() }));

    // 10. Demo Mode Sandbox Isolation (Mandatory Policy per AGENTS.md)
    console.log('\n--- 10. Demo Mode Sandbox Isolation & Immutability ---');
    const demoLogin = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoLogin.status === 200, 'Demo visitor logs in successfully');
    const demoData = getData(demoLogin);
    const demoToken = demoData.token;
    assert(demoData.user?.isDemo === true, 'User flagged as isDemo = true');

    // Demo visitor gets challenges (includes canonical baseline)
    const demoChallengesRes = await request('/challenges', 'GET', null, demoToken);
    assert(demoChallengesRes.status === 200, 'Demo visitor retrieves challenges');
    const demoChallenges = demoChallengesRes.data?.data?.challenges || demoChallengesRes.data?.challenges;
    assert(demoChallenges.length >= 2, 'Demo baseline contains pre-populated canonical challenges');

    // Demo visitor creates challenge in sandbox
    const demoCreateRes = await request('/challenges', 'POST', {
      title: 'Demo Visitor Sandbox Challenge',
      description: 'Ephemeral challenge created inside visitor sandbox.',
      associatedSkill: 'TypeScript',
      startDate: new Date(now.getTime() - 86400000).toISOString(),
      endDate: inThirtyDays.toISOString(),
      milestones: [{ title: 'Strict Type Audit', description: 'Enable noImplicitAny' }],
    }, demoToken);
    assert(demoCreateRes.status === 201, 'Demo visitor creates challenge in sandbox');

    // Complete isolation check: Real MongoDB collection MUST NOT contain the demo challenge
    const leakedChallenge = await Challenge.findOne({ title: 'Demo Visitor Sandbox Challenge' });
    assert(leakedChallenge === null, 'Complete Isolation: Demo challenge NEVER written to production MongoDB collection');

    // Demo visitor gets achievements
    const demoAchRes = await request('/challenges/achievements/my', 'GET', null, demoToken);
    assert(demoAchRes.status === 200, 'Demo visitor retrieves achievements from sandbox');
    const demoAchData = demoAchRes.data?.data || demoAchRes.data;
    assert(demoAchData.unlockedCount >= 2, 'Demo baseline achievements unlocked without production mutation');

    // Demo reset endpoint restores canonical baseline
    const resetRes = await request('/demo/reset', 'POST', { confirm: true }, demoToken);
    assert(resetRes.status === 200, 'Demo workspace reset restores canonical baseline idempotently');

    // Cleanups
    for (const fn of cleanups) {
      try { await fn(); } catch (e) { /* ignore cleanup error */ }
    }

  } catch (err) {
    console.error('Unhandled suite error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`🏁  V3.8 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runV38CommunityChallengesSuite();
