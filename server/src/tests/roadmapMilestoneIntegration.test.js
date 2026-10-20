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

async function runMilestoneIntegrationSuite() {
  console.log('====================================================');
  console.log('🚀 RUNNING V2.3 MILESTONE PROGRESS & ADAPTIVE INTEGRATION TESTS');
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
    const userAEmail = `v23_user_a_${timestamp}@enhanceus.org`;
    const userBEmail = `v23_user_b_${timestamp}@enhanceus.org`;
    const password = 'Password123!';

    // 1. Unauthenticated Security Checks (401)
    const dummyId = '507f1f77bcf86cd799439011';
    const unauthUpdate = await request(`/roadmaps/${dummyId}/milestones/ms_1`, 'PATCH', { action: 'START' });
    assert(unauthUpdate.status === 401, 'Unauthenticated Blocked: PATCH /milestones/:milestoneId (401)');

    const unauthPropose = await request(`/roadmaps/${dummyId}/milestones/ms_1/propose-breakdown`, 'POST', {});
    assert(unauthPropose.status === 401, 'Unauthenticated Blocked: POST /propose-breakdown (401)');

    const unauthApply = await request(`/roadmaps/${dummyId}/milestones/ms_1/apply-breakdown`, 'POST', { subMilestones: [] });
    assert(unauthApply.status === 401, 'Unauthenticated Blocked: POST /apply-breakdown (401)');

    const unauthInit = await request(`/roadmaps/${dummyId}/milestones/initialize`, 'POST', {});
    assert(unauthInit.status === 401, 'Unauthenticated Blocked: POST /initialize (401)');

    // 2. Register User A and User B
    const regResA = await request('/auth/register', 'POST', {
      name: 'V23 Learner Alice',
      email: userAEmail,
      password,
      skills: [{ name: 'Culinary Arts', category: 'General', level: 'BEGINNER' }],
    });
    assert(regResA.status === 201 && regResA.data?.data?.token, 'User A Registration');
    const tokenA = regResA.data?.data?.token;

    const regResB = await request('/auth/register', 'POST', {
      name: 'V23 Learner Bob',
      email: userBEmail,
      password,
      skills: [{ name: 'Python', category: 'Programming Languages', level: 'BEGINNER' }],
    });
    assert(regResB.status === 201 && regResB.data?.data?.token, 'User B Registration');
    const tokenB = regResB.data?.data?.token;

    // 3. User A creates a Goal & generates Roadmap
    const goalResA = await request('/goals', 'POST', {
      title: 'Full Stack Distributed Systems Mastery',
      description: 'Master Node.js, distributed databases, caching, and CI/CD automation.',
      targetDate: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    }, tokenA);
    assert(goalResA.status === 201 && goalResA.data?.data?.goal?._id, 'User A Goal Creation');
    const goalIdA = goalResA.data?.data?.goal?._id;

    console.log('  ⏳ Generating V2.3 Roadmap for User A...');
    const genRes = await request(`/roadmaps/generate/${goalIdA}`, 'POST', {
      targetOutcome: 'Build resilient distributed backends',
      timeCommitmentHoursPerWeek: 10,
    }, tokenA);
    assert(genRes.status === 201 && genRes.data?.data?.roadmap?._id, 'Roadmap Generation with V2.3 Initial Milestones');

    const roadmapA = genRes.data?.data?.roadmap;
    const roadmapIdA = roadmapA?._id;

    // 4. Verify Initial V2.3 Milestones & Progress
    assert(Array.isArray(roadmapA?.milestones) && roadmapA.milestones.length > 0, `Roadmap contains ${roadmapA?.milestones?.length} milestones`);
    assert(roadmapA?.progress && typeof roadmapA.progress.completionPercentage === 'number', 'Roadmap has structured progress object');
    assert(roadmapA.progress.completedCount === 0, 'Initial completed count is 0');
    assert(roadmapA.progress.completionPercentage === 0, 'Initial completion percentage is 0%');
    assert(roadmapA.progress.nextRecommendedMilestone !== null, 'Next recommended milestone is calculated');

    const firstMilestone = roadmapA.milestones[0];
    assert(firstMilestone?.milestoneId && firstMilestone?.title, `First milestone exists (${firstMilestone.milestoneId}: "${firstMilestone.title}")`);

    // 5. Multi-Tenant Isolation Checks
    console.log('  🛡️ Verifying Multi-Tenant Isolation...');
    const crossTenantUpdate = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'START' },
      tokenB
    );
    assert(crossTenantUpdate.status === 404, 'Multi-tenant Isolation: User B cannot modify User A milestone (404)');

    const crossTenantPropose = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}/propose-breakdown`,
      'POST',
      { userNote: 'Intruder note' },
      tokenB
    );
    assert(crossTenantPropose.status === 404, 'Multi-tenant Isolation: User B cannot propose breakdown on User A roadmap (404)');

    const crossTenantApply = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}/apply-breakdown`,
      'POST',
      { subMilestones: [], reason: 'Intrusion' },
      tokenB
    );
    assert(crossTenantApply.status === 404, 'Multi-tenant Isolation: User B cannot apply breakdown on User A roadmap (404)');

    // 6. Action: START Milestone
    console.log('  ▶️ Testing Milestone START Action...');
    const startRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'START' },
      tokenA
    );
    assert(startRes.status === 200, 'User A starts first milestone (HTTP 200)');
    const roadmapAfterStart = startRes.data?.data?.roadmap;
    const startedMs = roadmapAfterStart?.milestones?.find((m) => m.milestoneId === firstMilestone.milestoneId);
    assert(startedMs?.status === 'IN_PROGRESS', 'Milestone status transitioned to IN_PROGRESS');
    assert(startedMs?.startedAt !== null, 'Milestone startedAt timestamp recorded');
    assert(roadmapAfterStart?.progress?.inProgressCount === 1, 'Roadmap inProgressCount updated to 1');

    // 7. Action: Update Learner Notes
    console.log('  📝 Testing Learner Notes Persistence...');
    const notesRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'UPDATE_NOTES', learnerNotes: 'Set up local Redis cluster and verified failover behavior.' },
      tokenA
    );
    assert(notesRes.status === 200, 'Learner notes updated (HTTP 200)');
    const updatedMs = notesRes.data?.data?.roadmap?.milestones?.find((m) => m.milestoneId === firstMilestone.milestoneId);
    assert(
      updatedMs?.learnerNotes === 'Set up local Redis cluster and verified failover behavior.',
      'Learner notes persisted correctly'
    );

    // 8. Action: COMPLETE Milestone & Recalculate
    console.log('  ✅ Testing Milestone COMPLETE Action & Dynamic Unblocking...');
    const completeRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'COMPLETE', learnerNotes: 'Successfully completed with lab project.' },
      tokenA
    );
    assert(completeRes.status === 200, 'Milestone marked COMPLETE (HTTP 200)');
    const roadmapAfterComplete = completeRes.data?.data?.roadmap;
    const completedMs = roadmapAfterComplete?.milestones?.find((m) => m.milestoneId === firstMilestone.milestoneId);
    assert(completedMs?.status === 'COMPLETED', 'Milestone status transitioned to COMPLETED');
    assert(completedMs?.completedAt !== null, 'completedAt timestamp recorded');
    assert(roadmapAfterComplete?.progress?.completedCount === 1, 'Roadmap completedCount is 1');
    assert(roadmapAfterComplete?.progress?.completionPercentage > 0, `Roadmap completion percentage increased to ${roadmapAfterComplete?.progress?.completionPercentage}%`);

    // Verify next recommendation updated
    const nextRec = roadmapAfterComplete?.progress?.nextRecommendedMilestone;
    assert(nextRec !== null, `Next recommended milestone recalculated: "${nextRec?.title}"`);
    assert(nextRec?.milestoneId !== firstMilestone.milestoneId, 'Next recommendation advanced past completed milestone');

    // 9. Action: Duplicate Completion Attempt Prevention
    const dupRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'COMPLETE' },
      tokenA
    );
    assert(dupRes.status === 200, 'Duplicate completion handled gracefully without inflating progress');
    assert(dupRes.data?.data?.roadmap?.progress?.completedCount === 1, 'completedCount remained exactly 1');

    // 10. Action: Report Blocker
    console.log('  ⚠️ Testing Report Blocker...');
    const secondMilestone = roadmapAfterComplete.milestones[1];
    const blockRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${secondMilestone.milestoneId}`,
      'PATCH',
      { action: 'REPORT_BLOCKER', blockedReason: 'Need deeper background on database indexing before proceeding' },
      tokenA
    );
    assert(blockRes.status === 200, 'Blocker reported (HTTP 200)');
    const blockedMs = blockRes.data?.data?.roadmap?.milestones?.find((m) => m.milestoneId === secondMilestone.milestoneId);
    assert(blockedMs?.status === 'BLOCKED', 'Milestone transitioned to BLOCKED status');
    assert(blockedMs?.blockedReason.includes('database indexing'), 'Blocked reason recorded');
    assert(blockRes.data?.data?.roadmap?.progress?.blockedCount >= 1, 'progress.blockedCount incremented');

    // 11. Action: REOPEN Completed Milestone
    console.log('  🔄 Testing Milestone REOPEN Action...');
    const reopenRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'REOPEN' },
      tokenA
    );
    assert(reopenRes.status === 200, 'Milestone reopened (HTTP 200)');
    const roadmapAfterReopen = reopenRes.data?.data?.roadmap;
    const reopenedMs = roadmapAfterReopen?.milestones?.find((m) => m.milestoneId === firstMilestone.milestoneId);
    assert(reopenedMs?.status === 'IN_PROGRESS', 'Milestone transitioned back to IN_PROGRESS');
    assert(reopenedMs?.completedAt === null, 'completedAt timestamp cleared');
    assert(roadmapAfterReopen?.progress?.completedCount === 0, 'completedCount decreased to 0');
    assert(roadmapAfterReopen?.progress?.completionPercentage === 0, 'completion percentage recalculated to 0%');

    // Re-complete first milestone to continue with adaptive breakdown test
    await request(
      `/roadmaps/${roadmapIdA}/milestones/${firstMilestone.milestoneId}`,
      'PATCH',
      { action: 'COMPLETE' },
      tokenA
    );

    // 12. Controlled Adaptive Roadmap Adjustment: Propose & Apply Breakdown
    console.log('  🧩 Testing Controlled Adaptive Roadmap Adjustment Workflow...');
    const targetAdaptMs = secondMilestone;

    // 12a. Propose breakdown
    const proposeRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${targetAdaptMs.milestoneId}/propose-breakdown`,
      'POST',
      { userNote: 'Struggling with advanced indexing queries' },
      tokenA
    );
    assert(proposeRes.status === 200, 'Adaptive breakdown proposed successfully (HTTP 200)');
    assert(
      Array.isArray(proposeRes.data?.data?.subMilestones) && proposeRes.data.data.subMilestones.length >= 2,
      `Generated ${proposeRes.data?.data?.subMilestones?.length} structured sub-milestones`
    );
    const proposedSubMilestones = proposeRes.data.data.subMilestones;

    // 12b. Apply breakdown
    const applyRes = await request(
      `/roadmaps/${roadmapIdA}/milestones/${targetAdaptMs.milestoneId}/apply-breakdown`,
      'POST',
      {
        subMilestones: proposedSubMilestones,
        reason: 'Learner requested breakdown of database indexing concepts',
      },
      tokenA
    );
    assert(applyRes.status === 200, 'Adaptive breakdown applied to roadmap (HTTP 200)');
    const roadmapAfterAdapt = applyRes.data?.data?.roadmap;

    // Verify sub-milestones inserted and target milestone replaced
    const oldMsExists = roadmapAfterAdapt?.milestones?.some((m) => m.milestoneId === targetAdaptMs.milestoneId);
    assert(!oldMsExists, 'Original target milestone was replaced by sub-milestones');

    const adaptiveSubSteps = roadmapAfterAdapt?.milestones?.filter((m) => m.isAdaptiveAddition);
    assert(adaptiveSubSteps?.length === proposedSubMilestones.length, `${adaptiveSubSteps?.length} adaptive sub-steps inserted with isAdaptiveAddition: true`);

    // Verify completion history of previously completed milestone is 100% PRESERVED
    const preservedCompletedMs = roadmapAfterAdapt?.milestones?.find((m) => m.milestoneId === firstMilestone.milestoneId);
    assert(preservedCompletedMs?.status === 'COMPLETED', 'Prior completed milestone remained COMPLETED');
    assert(preservedCompletedMs?.completedAt !== null, 'Prior completedAt timestamp was preserved');

    // Verify history audit record
    assert(
      Array.isArray(roadmapAfterAdapt?.adaptiveAdjustmentHistory) && roadmapAfterAdapt.adaptiveAdjustmentHistory.length === 1,
      'Adaptive adjustment recorded in audit history'
    );
    assert(
      roadmapAfterAdapt.adaptiveAdjustmentHistory[0].originalMilestoneId === targetAdaptMs.milestoneId,
      'Audit record references original milestone ID'
    );

    // 13. Persistence check via GET /api/roadmaps/:id
    console.log('  💾 Verifying Full Persistence via GET...');
    const getRes = await request(`/roadmaps/${roadmapIdA}`, 'GET', null, tokenA);
    assert(getRes.status === 200, 'GET /api/roadmaps/:id successful');
    const persistedRoadmap = getRes.data?.data?.roadmap;
    assert(persistedRoadmap?.milestones?.length === roadmapAfterAdapt?.milestones?.length, 'Milestone count matches after GET');
    assert(persistedRoadmap?.progress?.completedCount === 1, 'Persisted completedCount matches');
    assert(persistedRoadmap?.adaptiveAdjustmentHistory?.length === 1, 'Persisted adaptiveAdjustmentHistory matches');

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runMilestoneIntegrationSuite();
