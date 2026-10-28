import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/userModel.js';
import Workspace from '../models/workspaceModel.js';
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

const getWs = (res) => res?.data?.data?.workspace || res?.data?.workspace;
const getData = (res) => res?.data?.data || res?.data;

async function runV37CollaborativeWorkspaceSuite() {
  console.log('================================================================');
  console.log('🤝  ENHANCEUS V3.7 COLLABORATIVE WORKSPACE INTEGRATION SUITE');
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

    // 1. URL Validation Helper Verification
    console.log('\n--- 1. HTTP/HTTPS URL Security Validation ---');
    assert(validateHttpUrl('https://react.dev') === 'https://react.dev', 'Accepts valid HTTPS URL');
    assert(validateHttpUrl('http://insecure-docs.org/guide') === 'http://insecure-docs.org/guide', 'Accepts valid HTTP URL');
    
    let threwXss = false;
    try { validateHttpUrl('javascript:alert(1)'); } catch (e) { threwXss = true; }
    assert(threwXss, 'Rejects javascript: XSS pseudo-protocol');

    let threwFile = false;
    try { validateHttpUrl('file:///etc/passwd'); } catch (e) { threwFile = true; }
    assert(threwFile, 'Rejects file:// local paths');

    let threwData = false;
    try { validateHttpUrl('data:text/html,<script>'); } catch (e) { threwData = true; }
    assert(threwData, 'Rejects data: URI injection');

    assert(validateHttpUrl('') === '', 'Returns empty string for empty input');
    assert(validateHttpUrl(null) === '', 'Returns empty string for null input');

    // 2. Real User Setup
    console.log('\n--- 2. Real User Setup & Email Verification ---');
    const timestamp = Date.now();
    const userAEmail = `v37_creator_${timestamp}@test.org`;
    const userBEmail = `v37_peer_${timestamp}@test.org`;
    const userCEmail = `v37_stranger_${timestamp}@test.org`;
    const unverifiedEmail = `v37_unverified_${timestamp}@test.org`;

    // Register User A (Workspace Creator)
    const resA = await request('/auth/register', 'POST', {
      name: 'Alice Creator',
      email: userAEmail,
      password: 'Password123!',
      skillsToTeach: ['React', 'TypeScript'],
      skillsToLearn: ['Docker'],
    });
    assert(resA.status === 201, 'User A registered');
    cleanups.push(() => User.deleteOne({ email: userAEmail }));
    await request('/auth/test-verify', 'POST', { email: userAEmail });
    const loginA = await request('/auth/login', 'POST', { email: userAEmail, password: 'Password123!' });
    const dataA = getData(loginA);
    const tokenA = dataA.token;
    const userAId = (dataA.user?._id || dataA.user?.id).toString();

    // Register User B (Invited Peer)
    const resB = await request('/auth/register', 'POST', {
      name: 'Bob Peer',
      email: userBEmail,
      password: 'Password123!',
      skillsToTeach: ['Docker'],
      skillsToLearn: ['React'],
    });
    assert(resB.status === 201, 'User B registered');
    cleanups.push(() => User.deleteOne({ email: userBEmail }));
    await request('/auth/test-verify', 'POST', { email: userBEmail });
    const loginB = await request('/auth/login', 'POST', { email: userBEmail, password: 'Password123!' });
    const dataB = getData(loginB);
    const tokenB = dataB.token;
    const userBId = (dataB.user?._id || dataB.user?.id).toString();

    // Register User C (Stranger / Non-Member)
    const resC = await request('/auth/register', 'POST', {
      name: 'Charlie Stranger',
      email: userCEmail,
      password: 'Password123!',
      skillsToTeach: ['Python'],
      skillsToLearn: ['Go'],
    });
    assert(resC.status === 201, 'User C registered');
    cleanups.push(() => User.deleteOne({ email: userCEmail }));
    await request('/auth/test-verify', 'POST', { email: userCEmail });
    const loginC = await request('/auth/login', 'POST', { email: userCEmail, password: 'Password123!' });
    const dataC = getData(loginC);
    const tokenC = dataC.token;

    // Register Unverified User
    const resUnv = await request('/auth/register', 'POST', {
      name: 'Unverified Learner',
      email: unverifiedEmail,
      password: 'Password123!',
      skillsToTeach: ['Ruby'],
      skillsToLearn: ['Rust'],
    });
    assert(resUnv.status === 201, 'Unverified user registered');
    cleanups.push(() => User.deleteOne({ email: unverifiedEmail }));
    const tokenUnv = getData(resUnv).token;

    // 3. Email Verification Guard Test
    console.log('\n--- 3. Unverified User Guard ---');
    const blockedRes = await request('/workspaces', 'POST', {
      title: 'Should be blocked',
      associatedSkill: 'Rust',
    }, tokenUnv);
    assert(blockedRes.status === 403, 'Unverified user rejected with 403 Forbidden');

    // 4. Workspace Creation & Validation
    console.log('\n--- 4. Workspace Creation & Owner Assignment ---');
    const failWsRes = await request('/workspaces', 'POST', {
      title: '',
      associatedSkill: '',
    }, tokenA);
    assert(failWsRes.status === 400, 'Rejects creation without required title and skill');

    const createWsRes = await request('/workspaces', 'POST', {
      title: 'Production Docker & React Architecture',
      description: 'Collaborative development space for containerizing full-stack microservices.',
      associatedSkill: 'Docker',
      associatedGoalTitle: 'Deploy production containers',
      visibility: 'PRIVATE',
    }, tokenA);

    assert(createWsRes.status === 201, 'Workspace created with 201 Created');
    const workspaceA = getWs(createWsRes);
    const wsOwnerId = (workspaceA.owner?._id || workspaceA.owner).toString();
    assert(wsOwnerId === userAId, 'Owner correctly set to User A');
    assert(workspaceA.members.length === 1 && workspaceA.members[0].role === 'OWNER', 'Owner added to members list with OWNER role');
    assert(workspaceA.visibility === 'PRIVATE', 'Visibility set to PRIVATE');
    cleanups.push(() => Workspace.deleteOne({ _id: workspaceA._id }));

    // 5. Access Control: Private vs Non-Member
    console.log('\n--- 5. Access Control & Authorization ---');
    // Stranger (User C) attempts to access User A's private workspace
    const strangerGetRes = await request(`/workspaces/${workspaceA._id}`, 'GET', null, tokenC);
    assert(strangerGetRes.status === 403, 'Unauthorized non-member is blocked with 403 from private workspace');

    // Owner (User A) accesses successfully
    const ownerGetRes = await request(`/workspaces/${workspaceA._id}`, 'GET', null, tokenA);
    assert(ownerGetRes.status === 200, 'Owner accesses private workspace successfully (200)');

    // 6. Member Invitations & Joining
    console.log('\n--- 6. Member Invitations & Response ---');
    // Non-member attempts to invite -> 403
    const strangerInviteRes = await request(`/workspaces/${workspaceA._id}/invite`, 'POST', {
      targetUserId: userBId,
      role: 'MEMBER',
    }, tokenC);
    assert(strangerInviteRes.status === 403, 'Unauthorized user cannot send invitations (403)');

    // Owner invites User B
    const inviteRes = await request(`/workspaces/${workspaceA._id}/invite`, 'POST', {
      targetUserId: userBId,
      role: 'MEMBER',
    }, tokenA);
    assert(inviteRes.status === 200, 'Owner invites User B successfully');

    // User B checks workspaces list -> pending invitation present
    const userBListRes = await request('/workspaces', 'GET', null, tokenB);
    assert(userBListRes.status === 200, 'User B lists workspaces');
    const pendingInvs = getData(userBListRes).pendingInvitations || [];
    const pendingInv = pendingInvs.find((ws) => ws._id === workspaceA._id);
    assert(Boolean(pendingInv), 'Pending invitation appears in User B invitations list');

    // User B accepts invitation
    const acceptRes = await request(`/workspaces/${workspaceA._id}/invitation/respond`, 'POST', {
      action: 'ACCEPT',
    }, tokenB);
    assert(acceptRes.status === 200, 'User B accepts invitation (200)');

    // Now User B has authorized access to private workspace
    const userBAccessRes = await request(`/workspaces/${workspaceA._id}`, 'GET', null, tokenB);
    assert(userBAccessRes.status === 200, 'Newly joined User B can now view workspace content');
    const wsMembers = getWs(userBAccessRes).members || [];
    const isUserBMember = wsMembers.some((m) => (m.user?._id || m.user).toString() === userBId);
    assert(isUserBMember, 'User B is listed as active member');

    // 7. Shared Milestones Lifecycle
    console.log('\n--- 7. Shared Milestones Lifecycle ---');
    const addMilestoneRes = await request(`/workspaces/${workspaceA._id}/milestones`, 'POST', {
      title: 'Containerize frontend with Multi-Stage Dockerfile',
      description: 'Optimize bundle size and use alpine base image.',
      status: 'PENDING',
    }, tokenB);
    assert(addMilestoneRes.status === 200 || addMilestoneRes.status === 201, 'Member User B can add shared milestone');
    const milestone1 = getData(addMilestoneRes).milestone || getWs(addMilestoneRes)?.milestones?.[0];
    assert(milestone1.title === 'Containerize frontend with Multi-Stage Dockerfile', 'Milestone title stored accurately');

    // Update milestone status to IN_PROGRESS
    const updateMsRes = await request(`/workspaces/${workspaceA._id}/milestones/${milestone1._id}`, 'PATCH', {
      status: 'IN_PROGRESS',
    }, tokenA);
    assert(updateMsRes.status === 200, 'Owner updates milestone status to IN_PROGRESS');

    // Update milestone to COMPLETED and verify progress calculation
    const completeMsRes = await request(`/workspaces/${workspaceA._id}/milestones/${milestone1._id}`, 'PATCH', {
      status: 'COMPLETED',
    }, tokenB);
    assert(completeMsRes.status === 200, 'Member marks milestone COMPLETED');
    const updatedWs = getWs(completeMsRes);
    const completedCount = updatedWs.milestones.filter((m) => m.status === 'COMPLETED').length;
    assert(completedCount === 1, '1 milestone marked COMPLETED');

    // Stranger attempts to delete milestone -> 403
    const strangerDeleteMs = await request(`/workspaces/${workspaceA._id}/milestones/${milestone1._id}`, 'DELETE', null, tokenC);
    assert(strangerDeleteMs.status === 403, 'Stranger cannot delete workspace milestone (403)');

    // 8. Shared Resources (Strict URL Validation)
    console.log('\n--- 8. Shared Resources (URL Validation) ---');
    // Malicious URL rejected
    const badUrlRes = await request(`/workspaces/${workspaceA._id}/resources`, 'POST', {
      title: 'XSS Attack Link',
      url: 'javascript:alert(document.cookie)',
    }, tokenA);
    assert(badUrlRes.status === 400, 'Server rejects non-HTTP(S) resource URLs with 400 Bad Request');

    // Valid HTTPS URL accepted
    const goodUrlRes = await request(`/workspaces/${workspaceA._id}/resources`, 'POST', {
      title: 'Official Docker Multi-stage Documentation',
      url: 'https://docs.docker.com/build/building/multi-stage/',
      description: 'Reference guide for multi-stage Docker builds',
    }, tokenA);
    assert(goodUrlRes.status === 200 || goodUrlRes.status === 201, 'Server accepts valid HTTPS resource URL');
    const resource1 = getData(goodUrlRes).resource || getWs(goodUrlRes)?.resources?.[0];
    assert(resource1.url === 'https://docs.docker.com/build/building/multi-stage/', 'Resource URL stored accurately');

    // Member User B attempts to delete User A's resource -> 403 Forbidden
    const memberDeleteRes = await request(`/workspaces/${workspaceA._id}/resources/${resource1._id}`, 'DELETE', null, tokenB);
    assert(memberDeleteRes.status === 403, 'Regular member cannot delete another member resource (403)');

    // Owner User A deletes resource -> 200 OK
    const deleteRes = await request(`/workspaces/${workspaceA._id}/resources/${resource1._id}`, 'DELETE', null, tokenA);
    assert(deleteRes.status === 200, 'Owner can remove resource (200)');

    // 9. Shared Collaborative Notes
    console.log('\n--- 9. Shared Collaborative Notes ---');
    const notesContent = '## Architecture Decisions\n- Use Alpine Node 20\n- Nginx reverse proxy with TLS';
    const notesRes = await request(`/workspaces/${workspaceA._id}/notes`, 'PATCH', {
      content: notesContent,
    }, tokenB);
    assert(notesRes.status === 200, 'Member updates collaborative workspace notes');
    assert((getData(notesRes).notes?.content || getWs(notesRes)?.notes?.content) === notesContent, 'Collaborative notes content saved');

    // 10. Workspace Discussions
    console.log('\n--- 10. Workspace Discussions ---');
    // Empty message rejected
    const emptyMsgRes = await request(`/workspaces/${workspaceA._id}/discussions`, 'POST', {
      content: '   ',
    }, tokenA);
    assert(emptyMsgRes.status === 400, 'Rejects empty discussion message with 400');

    // Non-member discussion post rejected -> 403
    const strangerMsgRes = await request(`/workspaces/${workspaceA._id}/discussions`, 'POST', {
      content: 'I should not be able to talk here.',
    }, tokenC);
    assert(strangerMsgRes.status === 403, 'Unauthorized non-member blocked from posting discussion (403)');

    // Authorized member posts message
    const msgRes = await request(`/workspaces/${workspaceA._id}/discussions`, 'POST', {
      content: 'Team, the multi-stage Dockerfile is ready for review.',
    }, tokenB);
    assert(msgRes.status === 200 || msgRes.status === 201, 'Authorized member posts discussion message (200/201)');
    const latestMsg = getData(msgRes).message || getWs(msgRes)?.discussions?.slice(-1)[0];
    assert(latestMsg.content === 'Team, the multi-stage Dockerfile is ready for review.', 'Discussion content matches');

    // 11. Member Removal & Leaving
    console.log('\n--- 11. Member Removal & Leaving ---');
    // User cannot remove owner
    const removeOwnerRes = await request(`/workspaces/${workspaceA._id}/members/${userAId}`, 'DELETE', null, tokenB);
    assert(removeOwnerRes.status === 400 || removeOwnerRes.status === 403, 'Owner cannot be removed from workspace (400/403)');

    // Member User B leaves workspace
    const leaveRes = await request(`/workspaces/${workspaceA._id}/members/${userBId}`, 'DELETE', null, tokenB);
    assert(leaveRes.status === 200, 'Member can leave workspace (200)');

    // Verify User B is no longer authorized
    const accessAfterLeave = await request(`/workspaces/${workspaceA._id}`, 'GET', null, tokenB);
    assert(accessAfterLeave.status === 403, 'Former member blocked from private workspace after leaving (403)');

    // 12. DEMO VISITOR SANDBOX ISOLATION (MANDATORY POLICY)
    console.log('\n--- 12. Demo Visitor Sandbox Isolation ---');
    // Demo login
    const demoLoginRes = await request('/auth/login', 'POST', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    assert(demoLoginRes.status === 200, 'Demo visitor logged in');
    const demoData = getData(demoLoginRes);
    const demoToken = demoData.token;
    assert(Boolean(demoData.user?.workspaceId || demoData.workspaceId), 'Demo response contains workspaceId');

    // Check demo workspaces list
    const demoListRes = await request('/workspaces', 'GET', null, demoToken);
    assert(demoListRes.status === 200, 'Demo visitor retrieves workspaces from sandbox');
    const demoWorkspaces = getData(demoListRes).workspaces || [];
    assert(demoWorkspaces.length >= 1, 'Demo visitor sees baseline collaborative workspace');
    const demoWs = demoWorkspaces[0];
    assert(demoWs.associatedSkill === 'Full-Stack Development', 'Baseline demo workspace skill is Full-Stack Development');

    // Mutate demo workspace in sandbox (add milestone)
    const demoAddMs = await request(`/workspaces/${demoWs._id}/milestones`, 'POST', {
      title: 'Demo-Only Milestone Mutation',
      status: 'PENDING',
    }, demoToken);
    assert(demoAddMs.status === 200 || demoAddMs.status === 201, 'Demo visitor adds milestone in isolated sandbox (200/201)');

    // Mutate demo notes
    const demoNotesRes = await request(`/workspaces/${demoWs._id}/notes`, 'PATCH', {
      content: 'Sandbox notes edited by demo visitor',
    }, demoToken);
    assert(demoNotesRes.status === 200, 'Demo visitor edits notes in sandbox');

    // Mutate demo discussion
    const demoPostMsg = await request(`/workspaces/${demoWs._id}/discussions`, 'POST', {
      content: 'Simulated message from demo visitor',
    }, demoToken);
    assert(demoPostMsg.status === 200 || demoPostMsg.status === 201, 'Demo visitor posts discussion in sandbox (200/201)');

    // VERIFY ZERO LEAKAGE TO REAL MONGODB WORKSPACES
    const realDbMatch = await Workspace.findOne({ 'milestones.title': 'Demo-Only Milestone Mutation' });
    assert(realDbMatch === null, 'CRITICAL: Demo mutations did NOT contaminate production MongoDB Workspaces');

    // Reset demo workspace
    const resetRes = await request('/demo/reset', 'POST', { confirm: true }, demoToken);
    assert(resetRes.status === 200, 'Demo reset succeeded');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    // Clean up created real records
    for (const cleanup of cleanups) {
      try {
        await cleanup();
      } catch (e) {
        // ignore
      }
    }
  }

  console.log('\n================================================================');
  console.log(`📊  RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runV37CollaborativeWorkspaceSuite();
