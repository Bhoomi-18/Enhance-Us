import {
  MILESTONE_STATUS,
  generateInitialMilestones,
  calculateRoadmapProgress,
  updateMilestoneStatus,
  proposeMilestoneBreakdown,
  applyMilestoneBreakdown,
} from '../services/milestoneEngine.js';

function runMilestoneEngineUnitTests() {
  console.log('====================================================');
  console.log('🏁 RUNNING V2.3 MILESTONE & ADAPTIVE PROGRESS TESTS');
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

  // Test 1: Empty milestones array handling (zero division protection)
  const emptyRes = calculateRoadmapProgress([], [], []);
  assert(
    emptyRes.progress.totalMilestones === 0 &&
      emptyRes.progress.completionPercentage === 0 &&
      emptyRes.progress.nextRecommendedMilestoneId === null,
    'Empty Milestones: Safely returns 0% without NaN or division by zero'
  );

  // Test 2: Progress calculation with all incomplete milestones
  const sampleMilestones = [
    {
      milestoneId: 'ms_1',
      title: 'Docker Basics',
      skillName: 'Docker',
      orderIndex: 1,
      status: MILESTONE_STATUS.NOT_STARTED,
      requiredPrerequisites: [],
    },
    {
      milestoneId: 'ms_2',
      title: 'Docker Compose',
      skillName: 'Docker',
      orderIndex: 2,
      status: MILESTONE_STATUS.NOT_STARTED,
      requiredPrerequisites: [],
    },
    {
      milestoneId: 'ms_3',
      title: 'Kubernetes Pods',
      skillName: 'Kubernetes',
      orderIndex: 3,
      status: MILESTONE_STATUS.BLOCKED,
      requiredPrerequisites: ['Docker'],
    },
  ];

  const incompleteRes = calculateRoadmapProgress(sampleMilestones, [], [{ fromSkill: 'Docker', toSkill: 'Kubernetes', type: 'REQUIRED' }]);
  assert(
    incompleteRes.progress.totalMilestones === 3 &&
      incompleteRes.progress.completedMilestones === 0 &&
      incompleteRes.progress.completionPercentage === 0 &&
      incompleteRes.progress.nextRecommendedMilestoneId === 'ms_1',
    'All Incomplete Milestones: Correct 0% completion and recommends ms_1'
  );

  // Test 3: Partial and Full completion
  const partialMilestones = [
    { ...sampleMilestones[0], status: MILESTONE_STATUS.COMPLETED },
    { ...sampleMilestones[1], status: MILESTONE_STATUS.NOT_STARTED },
    { ...sampleMilestones[2], status: MILESTONE_STATUS.BLOCKED },
  ];
  const partialRes = calculateRoadmapProgress(partialMilestones, [], [{ fromSkill: 'Docker', toSkill: 'Kubernetes', type: 'REQUIRED' }]);
  assert(
    partialRes.progress.completedMilestones === 1 &&
      partialRes.progress.completionPercentage === 33 &&
      partialRes.progress.nextRecommendedMilestoneId === 'ms_2',
    'Partial Completion: 1/3 completed rounds to 33%, recommends next unblocked ms_2'
  );

  // Test 4: Prerequisite unblocking when all prerequisite milestones complete
  const allPrereqDone = [
    { ...sampleMilestones[0], status: MILESTONE_STATUS.COMPLETED },
    { ...sampleMilestones[1], status: MILESTONE_STATUS.COMPLETED },
    { ...sampleMilestones[2], status: MILESTONE_STATUS.BLOCKED },
  ];
  const unblockRes = calculateRoadmapProgress(allPrereqDone, [], [{ fromSkill: 'Docker', toSkill: 'Kubernetes', type: 'REQUIRED' }]);
  const ms3 = unblockRes.updatedMilestones.find((m) => m.milestoneId === 'ms_3');
  assert(
    ms3.status === MILESTONE_STATUS.NOT_STARTED &&
      unblockRes.progress.nextRecommendedMilestoneId === 'ms_3',
    'Prerequisite Satisfaction: Completing Docker unblocks Kubernetes ms_3 to NOT_STARTED'
  );

  // Test 5: Reopening completed milestone drops progress and re-blocks downstream
  const mockRoadmap = {
    _id: 'road_123',
    milestones: [
      {
        milestoneId: 'ms_1',
        title: 'Docker Basics',
        skillName: 'Docker',
        orderIndex: 1,
        status: MILESTONE_STATUS.COMPLETED,
        completedAt: new Date(),
        requiredPrerequisites: [],
      },
      {
        milestoneId: 'ms_2',
        title: 'Kubernetes Deployment',
        skillName: 'Kubernetes',
        orderIndex: 2,
        status: MILESTONE_STATUS.NOT_STARTED,
        requiredPrerequisites: ['Docker'],
      },
    ],
    skills: [{ name: 'Docker' }, { name: 'Kubernetes' }],
    dependencyEdges: [{ fromSkill: 'Docker', toSkill: 'Kubernetes', type: 'REQUIRED' }],
  };

  const reopenResult = updateMilestoneStatus(mockRoadmap, 'ms_1', 'REOPEN', { notes: 'Need more practice' });
  const reopenedMs1 = reopenResult.roadmap.milestones.find((m) => m.milestoneId === 'ms_1');
  const reblockedMs2 = reopenResult.roadmap.milestones.find((m) => m.milestoneId === 'ms_2');
  assert(
    reopenedMs1.status === MILESTONE_STATUS.IN_PROGRESS &&
      reopenedMs1.completedAt === null &&
      reopenedMs1.learnerNotes === 'Need more practice' &&
      reblockedMs2.status === MILESTONE_STATUS.BLOCKED &&
      reopenResult.progress.completionPercentage === 0,
    'Reopening Milestone: Drops progress, clears completedAt, and re-blocks downstream milestone'
  );

  // Test 6: Starting a blocked milestone is rejected with 400 ApiError
  let blockedStartBlocked = false;
  try {
    updateMilestoneStatus(mockRoadmap, 'ms_2', 'START');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('blocked')) {
      blockedStartBlocked = true;
    }
  }
  assert(blockedStartBlocked, 'Prerequisite Guard: Cannot START a blocked milestone (HTTP 400)');

  // Test 7: Completing a blocked milestone is rejected with 400 ApiError
  let blockedCompleteBlocked = false;
  try {
    updateMilestoneStatus(mockRoadmap, 'ms_2', 'COMPLETE');
  } catch (err) {
    if (err.statusCode === 400 && err.message.includes('blocked')) {
      blockedCompleteBlocked = true;
    }
  }
  assert(blockedCompleteBlocked, 'Prerequisite Guard: Cannot COMPLETE a blocked milestone (HTTP 400)');

  // Test 8: Completing ms_1 unblocks ms_2 and allows completion
  updateMilestoneStatus(mockRoadmap, 'ms_1', 'COMPLETE');
  const ms2Unblocked = mockRoadmap.milestones.find((m) => m.milestoneId === 'ms_2');
  assert(
    ms2Unblocked.status === MILESTONE_STATUS.NOT_STARTED,
    'Sequential Progression: Completing ms_1 unblocks ms_2 to NOT_STARTED'
  );

  updateMilestoneStatus(mockRoadmap, 'ms_2', 'COMPLETE', { notes: 'Deployed sample pods' });
  assert(
    mockRoadmap.progress.completionPercentage === 100 &&
      mockRoadmap.progress.completedMilestones === 2,
    'Full Roadmap Completion: Progress reaches 100% (2/2 completed)'
  );

  // Test 9: Idempotent duplicate completion
  updateMilestoneStatus(mockRoadmap, 'ms_2', 'COMPLETE');
  assert(
    mockRoadmap.progress.completionPercentage === 100 &&
      mockRoadmap.progress.completedMilestones === 2,
    'Idempotent Completion: Duplicate completion action does not inflate progress beyond 100%'
  );

  // Test 10: Adaptive Breakdown Proposal
  const adaptiveRoadmap = {
    _id: 'road_adapt',
    milestones: [
      {
        milestoneId: 'ms_done',
        title: 'Linux CLI Mastery',
        skillName: 'Linux',
        orderIndex: 1,
        status: MILESTONE_STATUS.COMPLETED,
        requiredPrerequisites: [],
      },
      {
        milestoneId: 'ms_hard',
        title: 'Kubernetes Cluster Architecture: Ingress and Service Meshes',
        skillName: 'Kubernetes',
        orderIndex: 2,
        status: MILESTONE_STATUS.IN_PROGRESS,
        requiredPrerequisites: [],
      },
    ],
    skills: [{ name: 'Linux' }, { name: 'Kubernetes' }],
    dependencyEdges: [],
    adaptiveAdjustmentHistory: [],
  };

  const proposal = proposeMilestoneBreakdown(adaptiveRoadmap, 'ms_hard', 'Too complex');
  assert(
    proposal.proposedSubMilestones.length === 3 &&
      proposal.targetMilestone.milestoneId === 'ms_hard' &&
      proposal.proposedSubMilestones[0].isAdaptiveAddition === true,
    'Adaptive Proposal: Proposes 3 structured sub-milestones for difficult task'
  );

  // Test 11: Applying Adaptive Breakdown preserves completed history
  const applyRes = applyMilestoneBreakdown(adaptiveRoadmap, 'ms_hard', proposal.proposedSubMilestones, 'User requested drill down');
  const completedStillExists = applyRes.roadmap.milestones.find((m) => m.milestoneId === 'ms_done');
  assert(
    completedStillExists &&
      completedStillExists.status === MILESTONE_STATUS.COMPLETED &&
      applyRes.roadmap.milestones.length === 4 &&
      applyRes.roadmap.adaptiveAdjustmentHistory.length === 1 &&
      applyRes.progress.completedMilestones === 1 &&
      applyRes.progress.totalMilestones === 4 &&
      applyRes.progress.completionPercentage === 25,
    'History Preservation: Completed milestones preserved intact when breaking down incomplete milestones'
  );

  // Test 12: Cannot break down an already completed milestone
  let completeBreakdownBlocked = false;
  try {
    proposeMilestoneBreakdown(adaptiveRoadmap, 'ms_done');
  } catch (err) {
    if (err.statusCode === 400) {
      completeBreakdownBlocked = true;
    }
  }
  assert(completeBreakdownBlocked, 'Integrity Check: Rejects adaptive breakdown on already completed milestone (400)');

  // Test 13: Milestone Generation from Roadmap & Profile Skills
  const rawRoadmap = {
    skills: [
      {
        name: 'JavaScript',
        learningObjectives: ['ES6 syntax', 'Async/await'],
        isPossessed: true,
      },
      {
        name: 'React',
        learningObjectives: ['Hooks & State', 'Component Architecture'],
        isPossessed: false,
      },
    ],
    stages: [
      {
        stageNumber: 1,
        title: 'Core Fundamentals',
        skillNames: ['JavaScript', 'React'],
        completionCriteria: ['Build responsive SPA'],
      },
    ],
    learningOrder: [
      { skillName: 'JavaScript', status: 'SATISFIED' },
      { skillName: 'React', status: 'READY' },
    ],
    dependencyEdges: [{ fromSkill: 'JavaScript', toSkill: 'React', type: 'REQUIRED' }],
  };

  const generatedMilestones = generateInitialMilestones(rawRoadmap, [{ name: 'JavaScript', level: 'ADVANCED' }]);
  const jsMilestones = generatedMilestones.filter((m) => m.skillName === 'JavaScript');
  const reactMilestones = generatedMilestones.filter((m) => m.skillName === 'React');

  assert(
    jsMilestones.length === 2 &&
      jsMilestones.every((m) => m.status === MILESTONE_STATUS.COMPLETED) &&
      reactMilestones.length === 2 &&
      reactMilestones.every((m) => m.status === MILESTONE_STATUS.NOT_STARTED),
    'Milestone Generation: Possessed skills start as COMPLETED and unblock downstream React milestones'
  );

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runMilestoneEngineUnitTests();
