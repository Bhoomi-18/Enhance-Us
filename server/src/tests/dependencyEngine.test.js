import {
  validateAndCleanEdges,
  detectCycle,
  topologicalSort,
  buildPersonalizedLearningOrder,
  generateDeterministicPrerequisites,
  SKILL_STATUS,
} from '../services/dependencyEngine.js';

function runDependencyEngineTests() {
  console.log('====================================================');
  console.log('🧠 RUNNING V2.2 DEPENDENCY & TOPOLOGICAL SORT TESTS');
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

  // Test 1: Simple A -> B Dependency
  const skillsAB = [
    { name: 'JavaScript', priority: 'high' },
    { name: 'React', priority: 'high' },
  ];
  const edgesAB = [{ fromSkill: 'JavaScript', toSkill: 'React', type: 'REQUIRED' }];
  const sortedAB = topologicalSort(skillsAB, edgesAB);
  assert(
    sortedAB.sortedNames[0] === 'JavaScript' && sortedAB.sortedNames[1] === 'React',
    'Simple A -> B Dependency: JavaScript precedes React'
  );

  // Test 2: Chain A -> B -> C Dependency
  const skillsABC = [
    { name: 'Node.js', priority: 'high' },
    { name: 'JavaScript', priority: 'high' },
    { name: 'Microservices', priority: 'medium' },
  ];
  const edgesABC = [
    { fromSkill: 'JavaScript', toSkill: 'Node.js', type: 'REQUIRED' },
    { fromSkill: 'Node.js', toSkill: 'Microservices', type: 'REQUIRED' },
  ];
  const sortedABC = topologicalSort(skillsABC, edgesABC);
  assert(
    sortedABC.sortedNames[0] === 'JavaScript' &&
      sortedABC.sortedNames[1] === 'Node.js' &&
      sortedABC.sortedNames[2] === 'Microservices',
    'Chain A -> B -> C: Correct linear sequence (JavaScript -> Node.js -> Microservices)'
  );

  // Test 3: Multiple Independent Skills (Parallel Learning Waves)
  const skillsParallel = [
    { name: 'Tailwind CSS', priority: 'medium' },
    { name: 'TypeScript', priority: 'medium' },
  ];
  const sortedParallel = topologicalSort(skillsParallel, []);
  assert(
    sortedParallel.parallelWaves[0].length === 2 &&
      sortedParallel.parallelWaves[0].includes('Tailwind CSS') &&
      sortedParallel.parallelWaves[0].includes('TypeScript'),
    'Independent Skills: Identified as parallel learning opportunity (wave length 2)'
  );

  // Test 4: Skill with Multiple Prerequisites (A & B -> C)
  const skillsMultiple = [
    { name: 'Python', priority: 'high' },
    { name: 'SQL', priority: 'high' },
    { name: 'Data Pipeline', priority: 'medium' },
  ];
  const edgesMultiple = [
    { fromSkill: 'Python', toSkill: 'Data Pipeline', type: 'REQUIRED' },
    { fromSkill: 'SQL', toSkill: 'Data Pipeline', type: 'REQUIRED' },
  ];
  const sortedMultiple = topologicalSort(skillsMultiple, edgesMultiple);
  assert(
    sortedMultiple.sortedNames.indexOf('Data Pipeline') === 2 &&
      sortedMultiple.sortedNames.indexOf('Python') < 2 &&
      sortedMultiple.sortedNames.indexOf('SQL') < 2,
    'Multiple Prerequisites: Dependent skill appears only after all required prerequisites'
  );

  // Test 5: Self-Dependency Rejection
  const rawSelf = [{ fromSkill: 'React', toSkill: 'React', type: 'REQUIRED' }];
  const cleanSelf = validateAndCleanEdges(skillsAB, rawSelf);
  assert(
    cleanSelf.cleanedEdges.length === 0 && cleanSelf.rejectedEdges.length === 1,
    'Self-Dependency Rejection: Graph validator cleanly rejects A -> A edge'
  );

  // Test 6: Unknown Skill Identifiers Rejection
  const rawUnknown = [{ fromSkill: 'UnknownSkillX', toSkill: 'React', type: 'REQUIRED' }];
  const cleanUnknown = validateAndCleanEdges(skillsAB, rawUnknown);
  assert(
    cleanUnknown.cleanedEdges.length === 0 && cleanUnknown.rejectedEdges.length === 1,
    'Unknown Skill Rejection: Disallows edges referencing skills outside roadmap'
  );

  // Test 7: Duplicate Edges Removal (Highest Severity Kept)
  const rawDuplicates = [
    { fromSkill: 'JavaScript', toSkill: 'React', type: 'RECOMMENDED' },
    { fromSkill: 'JavaScript', toSkill: 'React', type: 'REQUIRED' },
  ];
  const cleanDuplicates = validateAndCleanEdges(skillsAB, rawDuplicates);
  assert(
    cleanDuplicates.cleanedEdges.length === 1 &&
      cleanDuplicates.cleanedEdges[0].type === 'REQUIRED',
    'Duplicate Edge Resolution: Keeps single most strict edge type (REQUIRED > RECOMMENDED)'
  );

  // Test 8: Cycle Detection (A -> B -> C -> A)
  const skillsCycle = [
    { name: 'Alpha', priority: 'high' },
    { name: 'Beta', priority: 'high' },
    { name: 'Gamma', priority: 'high' },
  ];
  const edgesCycle = [
    { fromSkill: 'Alpha', toSkill: 'Beta', type: 'REQUIRED' },
    { fromSkill: 'Beta', toSkill: 'Gamma', type: 'REQUIRED' },
    { fromSkill: 'Gamma', toSkill: 'Alpha', type: 'REQUIRED' },
  ];
  const cycleResult = detectCycle(skillsCycle, edgesCycle);
  assert(
    cycleResult.hasCycle === true && cycleResult.cyclePath.length >= 3,
    'Cycle Detection: Accurately detects directed cycle (Alpha -> Beta -> Gamma -> Alpha)'
  );

  // Test 9: Recommended vs Required Prerequisites
  // Recommended does not block skill status
  const skillsRec = [
    { name: 'Git', priority: 'medium' },
    { name: 'React', priority: 'high' },
  ];
  const edgesRec = [{ fromSkill: 'Git', toSkill: 'React', type: 'RECOMMENDED', reason: 'Version control aids code tracking.' }];
  const orderRec = buildPersonalizedLearningOrder(skillsRec, edgesRec, []);
  const reactStep = orderRec.learningOrder.find((s) => s.skillName === 'React');
  assert(
    reactStep.status === SKILL_STATUS.READY &&
      reactStep.recommendedPrerequisites.includes('Git') &&
      reactStep.unmetPrerequisites.length === 0,
    'Recommended Prerequisites: Does not block skill status from READY'
  );

  // Test 10: Already-Satisfied Prerequisite Personalization
  const userProfile = [{ name: 'JavaScript', level: 'advanced' }];
  const orderSatisfied = buildPersonalizedLearningOrder(skillsAB, edgesAB, userProfile);
  const jsStep = orderSatisfied.learningOrder.find((s) => s.skillName === 'JavaScript');
  const reactStep2 = orderSatisfied.learningOrder.find((s) => s.skillName === 'React');
  assert(
    jsStep.status === SKILL_STATUS.SATISFIED &&
      reactStep2.status === SKILL_STATUS.READY &&
      reactStep2.satisfiedPrerequisites.includes('JavaScript') &&
      reactStep2.unmetPrerequisites.length === 0,
    'Personalization: Prerequisite marked SATISFIED from profile and unblocks dependent skill'
  );

  // Test 11: Blocked Skill with Unmet Prerequisite
  const orderBlocked = buildPersonalizedLearningOrder(skillsAB, edgesAB, []);
  const reactBlocked = orderBlocked.learningOrder.find((s) => s.skillName === 'React');
  assert(
    reactBlocked.status === SKILL_STATUS.BLOCKED &&
      reactBlocked.unmetPrerequisites.includes('JavaScript'),
    'Blocked State: Unfulfilled required prerequisite sets status to BLOCKED with unmet list'
  );

  // Test 12: Deterministic Ordering for Identical Graph
  const run1 = topologicalSort(skillsABC, edgesABC).sortedNames.join('->');
  const run2 = topologicalSort(skillsABC, edgesABC).sortedNames.join('->');
  assert(run1 === run2, 'Reproducibility: Repeated topological sorts produce 100% deterministic order');

  // Test 13: Deterministic Fallback Generator
  const stages = [
    { stageNumber: 1, title: 'Basics', skillNames: ['Docker'] },
    { stageNumber: 2, title: 'Advanced', skillNames: ['Kubernetes'] },
  ];
  const skillsDockerK8s = [{ name: 'Docker' }, { name: 'Kubernetes' }];
  const fallbackEdges = generateDeterministicPrerequisites(skillsDockerK8s, stages);
  assert(
    fallbackEdges.some((e) => e.fromSkill === 'Docker' && e.toSkill === 'Kubernetes'),
    'Deterministic Fallback: Generates logical prerequisite link from stages and taxonomy'
  );

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runDependencyEngineTests();
