import { ApiError } from '../utils/apiError.js';

export const DEPENDENCY_TYPES = {
  REQUIRED: 'REQUIRED',
  RECOMMENDED: 'RECOMMENDED',
  OPTIONAL_RELATED: 'OPTIONAL_RELATED',
};

export const SKILL_STATUS = {
  READY: 'READY',
  BLOCKED: 'BLOCKED',
  SATISFIED: 'SATISFIED',
  IN_PROGRESS: 'IN_PROGRESS',
  UNKNOWN: 'UNKNOWN',
};

const LEVEL_WEIGHTS = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

const PRIORITY_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Normalizes and validates raw dependency edges against roadmap skills
 */
export const validateAndCleanEdges = (skills = [], rawEdges = []) => {
  if (!Array.isArray(skills) || skills.length === 0) {
    return { cleanedEdges: [], rejectedEdges: [] };
  }

  // Canonical map: lowercased name -> canonical name
  const canonicalSkillMap = new Map();
  skills.forEach((s) => {
    if (s?.name) {
      canonicalSkillMap.set(s.name.trim().toLowerCase(), s.name.trim());
    }
  });

  const edgeMap = new Map(); // key: `${from}||${to}` -> edge
  const rejectedEdges = [];

  (rawEdges || []).forEach((edge) => {
    if (!edge || typeof edge !== 'object') {
      rejectedEdges.push({ edge, reason: 'Malformed edge object' });
      return;
    }

    const rawFrom = typeof edge.fromSkill === 'string' ? edge.fromSkill.trim() : '';
    const rawTo = typeof edge.toSkill === 'string' ? edge.toSkill.trim() : '';

    const fromCanonical = canonicalSkillMap.get(rawFrom.toLowerCase());
    const toCanonical = canonicalSkillMap.get(rawTo.toLowerCase());

    // 1. Validate both skills exist in the roadmap
    if (!fromCanonical || !toCanonical) {
      rejectedEdges.push({
        edge,
        reason: `References non-existent skill: from="${rawFrom}", to="${rawTo}"`,
      });
      return;
    }

    // 2. Reject self-dependencies
    if (fromCanonical.toLowerCase() === toCanonical.toLowerCase()) {
      rejectedEdges.push({
        edge,
        reason: `Self-dependency rejected for skill "${fromCanonical}"`,
      });
      return;
    }

    // 3. Validate dependency type
    let depType = (edge.type || 'REQUIRED').toUpperCase();
    if (!['REQUIRED', 'RECOMMENDED', 'OPTIONAL_RELATED'].includes(depType)) {
      depType = 'REQUIRED';
    }

    const key = `${fromCanonical.toLowerCase()}||${toCanonical.toLowerCase()}`;
    const existing = edgeMap.get(key);

    const typeRanks = { REQUIRED: 3, RECOMMENDED: 2, OPTIONAL_RELATED: 1 };
    if (!existing || typeRanks[depType] > typeRanks[existing.type]) {
      edgeMap.set(key, {
        fromSkill: fromCanonical,
        toSkill: toCanonical,
        type: depType,
        reason: (edge.reason || '').trim().slice(0, 500),
      });
    }
  });

  const cleanedEdges = Array.from(edgeMap.values());
  return { cleanedEdges, rejectedEdges };
};

/**
 * Detects cycles in directed graph edges (specifically focusing on REQUIRED and RECOMMENDED edges)
 * Uses DFS with graph coloring: 0 = unvisited, 1 = visiting, 2 = visited
 */
export const detectCycle = (skills = [], edges = []) => {
  const skillNames = skills.map((s) => s.name);
  const adj = new Map();
  skillNames.forEach((name) => adj.set(name, []));

  // Only consider REQUIRED and RECOMMENDED dependencies as blocking or directional
  edges.forEach((edge) => {
    if (adj.has(edge.fromSkill)) {
      adj.get(edge.fromSkill).push(edge.toSkill);
    }
  });

  const state = new Map(); // 0 = unvisited, 1 = visiting, 2 = visited
  const parent = new Map();
  skillNames.forEach((name) => state.set(name, 0));

  let cycleFound = null;

  const dfs = (curr, path = []) => {
    state.set(curr, 1);
    path.push(curr);

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (state.get(next) === 1) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(next);
        cycleFound = path.slice(cycleStartIndex).concat(next);
        return true;
      }
      if (state.get(next) === 0) {
        parent.set(next, curr);
        if (dfs(next, path)) return true;
      }
    }

    path.pop();
    state.set(curr, 2);
    return false;
  };

  for (const name of skillNames) {
    if (state.get(name) === 0) {
      if (dfs(name, [])) {
        return { hasCycle: true, cyclePath: cycleFound };
      }
    }
  }

  return { hasCycle: false, cyclePath: null };
};

/**
 * Deterministic topological sorting with multi-attribute tie-breaking
 * Uses Kahn's algorithm
 */
export const topologicalSort = (skills = [], edges = []) => {
  const skillMap = new Map();
  const inDegree = new Map();
  const adj = new Map(); // fromSkill -> [toSkills]
  const reverseAdj = new Map(); // toSkill -> [fromSkills]

  skills.forEach((s) => {
    skillMap.set(s.name, s);
    inDegree.set(s.name, 0);
    adj.set(s.name, []);
    reverseAdj.set(s.name, []);
  });

  // Only REQUIRED edges strictly constrain the topological in-degree
  edges.forEach((edge) => {
    if (edge.type === 'REQUIRED') {
      if (adj.has(edge.fromSkill) && inDegree.has(edge.toSkill)) {
        adj.get(edge.fromSkill).push(edge.toSkill);
        reverseAdj.get(edge.toSkill).push(edge.fromSkill);
        inDegree.set(edge.toSkill, (inDegree.get(edge.toSkill) || 0) + 1);
      }
    }
  });

  // Deterministic tie-breaking comparator:
  // 1. Possessed skills first (satisfies dependencies early)
  // 2. Priority: high > medium > low
  // 3. Alphabetical tie-breaker
  const compareSkills = (aName, bName) => {
    const aSkill = skillMap.get(aName);
    const bSkill = skillMap.get(bName);

    // 1. Possessed first
    const aPossessed = Boolean(aSkill?.isPossessed);
    const bPossessed = Boolean(bSkill?.isPossessed);
    if (aPossessed !== bPossessed) {
      return aPossessed ? -1 : 1;
    }

    // 2. Priority
    const aPrio = PRIORITY_WEIGHTS[(aSkill?.priority || 'medium').toLowerCase()] || 2;
    const bPrio = PRIORITY_WEIGHTS[(bSkill?.priority || 'medium').toLowerCase()] || 2;
    if (aPrio !== bPrio) {
      return bPrio - aPrio; // Descending
    }

    // 3. Stable alphabetical
    return aName.localeCompare(bName);
  };

  // Queue of nodes with in-degree 0
  const zeroQueue = [];
  inDegree.forEach((deg, name) => {
    if (deg === 0) zeroQueue.push(name);
  });

  zeroQueue.sort(compareSkills);

  const sortedNames = [];
  const parallelWaves = []; // array of arrays representing waves of ready skills

  while (zeroQueue.length > 0) {
    const currentWave = [...zeroQueue];
    parallelWaves.push(currentWave);

    const nextWaveZero = [];

    // Process nodes in current wave
    for (const curr of currentWave) {
      sortedNames.push(curr);
      const neighbors = adj.get(curr) || [];
      for (const next of neighbors) {
        const newDeg = inDegree.get(next) - 1;
        inDegree.set(next, newDeg);
        if (newDeg === 0) {
          nextWaveZero.push(next);
        }
      }
    }

    // Clear and refill with next wave
    zeroQueue.length = 0;
    nextWaveZero.sort(compareSkills);
    zeroQueue.push(...nextWaveZero);
  }

  // If sorted count < skills length, a cycle exists among required edges
  if (sortedNames.length < skills.length) {
    throw new ApiError(
      400,
      'Cannot compute learning order: A cyclic dependency exists among required prerequisite skills.'
    );
  }

  return { sortedNames, parallelWaves };
};

/**
 * Builds personalized learning order steps with status, prerequisites, and explanations
 */
export const buildPersonalizedLearningOrder = (
  skills = [],
  edges = [],
  userProfileSkills = []
) => {
  const { sortedNames, parallelWaves } = topologicalSort(skills, edges);

  const userSkillLevelMap = new Map();
  (userProfileSkills || []).forEach((s) => {
    if (s?.name) {
      const normalized = s.name.toLowerCase().trim();
      const lvl = (s.level || 'intermediate').toLowerCase();
      userSkillLevelMap.set(normalized, LEVEL_WEIGHTS[lvl] || 2);
    }
  });

  // Group parallel opportunities
  const parallelGroupMap = new Map();
  parallelWaves.forEach((wave) => {
    if (wave.length > 1) {
      wave.forEach((name) => {
        const others = wave.filter((o) => o !== name);
        parallelGroupMap.set(name, others);
      });
    }
  });

  const skillDataMap = new Map(skills.map((s) => [s.name, s]));
  const satisfiedSkillsSet = new Set();

  // First pass: identify skills already satisfied by profile
  skills.forEach((s) => {
    const userLvl = userSkillLevelMap.get(s.name.toLowerCase());
    const targetLvl = LEVEL_WEIGHTS[(s.targetLevel || 'intermediate').toLowerCase()] || 2;
    if (s.isPossessed || (userLvl !== undefined && userLvl >= targetLvl)) {
      satisfiedSkillsSet.add(s.name);
    }
  });

  // Build edge lookup maps
  const requiredPrereqsMap = new Map();
  const recommendedPrereqsMap = new Map();
  const reasonMap = new Map();

  skills.forEach((s) => {
    requiredPrereqsMap.set(s.name, []);
    recommendedPrereqsMap.set(s.name, []);
  });

  edges.forEach((e) => {
    if (e.type === 'REQUIRED') {
      requiredPrereqsMap.get(e.toSkill)?.push(e.fromSkill);
    } else if (e.type === 'RECOMMENDED') {
      recommendedPrereqsMap.get(e.toSkill)?.push(e.fromSkill);
    }
    if (e.reason) {
      const key = `${e.fromSkill}||${e.toSkill}`;
      reasonMap.set(key, e.reason);
    }
  });

  // Generate learning order steps
  const learningOrder = sortedNames.map((name, index) => {
    const skill = skillDataMap.get(name);
    const required = requiredPrereqsMap.get(name) || [];
    const recommended = recommendedPrereqsMap.get(name) || [];

    const satisfiedPrereqs = required.filter((r) => satisfiedSkillsSet.has(r));
    const unmetPrereqs = required.filter((r) => !satisfiedSkillsSet.has(r));

    let status = SKILL_STATUS.READY;
    if (satisfiedSkillsSet.has(name)) {
      status = SKILL_STATUS.SATISFIED;
    } else if (unmetPrereqs.length > 0) {
      status = SKILL_STATUS.BLOCKED;
    }

    // Compose concise dependency explanation
    let explanation = '';
    if (status === SKILL_STATUS.SATISFIED) {
      explanation = 'Skill already satisfied by your verified profile background.';
    } else if (unmetPrereqs.length > 0) {
      const prereqReasons = unmetPrereqs
        .map((p) => reasonMap.get(`${p}||${name}`) || `Builds core foundation via ${p}`)
        .join('. ');
      explanation = `Requires foundational completion of ${unmetPrereqs.join(
        ', '
      )}. ${prereqReasons}`;
    } else if (required.length > 0) {
      explanation = `All prerequisites satisfied (${required.join(
        ', '
      )}). Ready for active development.`;
    } else if (recommended.length > 0) {
      explanation = `Ready to begin. Recommended preparation includes ${recommended.join(
        ', '
      )}.`;
    } else {
      explanation = 'Foundational entry skill with no blocking prerequisites.';
    }

    return {
      skillName: name,
      orderIndex: index + 1,
      status,
      requiredPrerequisites: required,
      recommendedPrerequisites: recommended,
      satisfiedPrerequisites: satisfiedPrereqs,
      unmetPrerequisites: unmetPrereqs,
      canLearnInParallelWith: parallelGroupMap.get(name) || [],
      explanation,
    };
  });

  return { learningOrder, parallelOpportunityGroups: parallelWaves.filter((w) => w.length > 1) };
};

/**
 * Deterministic fallback generator when AI is offline or times out
 * Builds logical prerequisite chains based on stages and standard skill hierarchies
 */
export const generateDeterministicPrerequisites = (skills = [], stages = []) => {
  const edges = [];
  const skillNamesSet = new Set(skills.map((s) => s.name));

  // 1. Stage-based sequential progression:
  // Skills in Stage N naturally serve as foundational prerequisites for Stage N+1
  if (Array.isArray(stages) && stages.length > 1) {
    for (let i = 0; i < stages.length - 1; i++) {
      const stageA = stages[i];
      const stageB = stages[i + 1];

      const stageASkills = (stageA.skillNames || []).filter((sn) => skillNamesSet.has(sn));
      const stageBSkills = (stageB.skillNames || []).filter((sn) => skillNamesSet.has(sn));

      if (stageASkills.length > 0 && stageBSkills.length > 0) {
        // Link primary foundational skill from stage A to primary target of stage B
        const fromSkill = stageASkills[0];
        const toSkill = stageBSkills[0];
        if (fromSkill !== toSkill) {
          edges.push({
            fromSkill,
            toSkill,
            type: 'REQUIRED',
            reason: `Foundational competencies established in ${stageA.title} are required before advancing to ${stageB.title}.`,
          });
        }
      }
    }
  }

  // 2. Domain taxonomy fallback heuristics
  const skillLowerMap = new Map(skills.map((s) => [s.name.toLowerCase(), s.name]));

  const domainRules = [
    { from: 'html', to: 'javascript', type: 'REQUIRED', reason: 'Web document structure is essential before interactive scripting.' },
    { from: 'css', to: 'javascript', type: 'RECOMMENDED', reason: 'Styling basics provide visual context for DOM manipulation.' },
    { from: 'javascript', to: 'react', type: 'REQUIRED', reason: 'Modern React heavily relies on ES6+ syntax, closures, and promises.' },
    { from: 'javascript', to: 'node', type: 'REQUIRED', reason: 'Server-side Node.js development builds directly upon JavaScript runtime fundamentals.' },
    { from: 'react', to: 'next', type: 'REQUIRED', reason: 'Next.js extends React with server-side rendering and routing paradigms.' },
    { from: 'docker', to: 'kubernetes', type: 'REQUIRED', reason: 'Containerization is a mandatory prerequisite for multi-node cluster orchestration.' },
    { from: 'database', to: 'api', type: 'RECOMMENDED', reason: 'Understanding data schemas accelerates RESTful or GraphQL endpoint design.' },
    { from: 'sql', to: 'backend', type: 'RECOMMENDED', reason: 'Relational data query patterns guide API data layer development.' },
  ];

  domainRules.forEach((rule) => {
    let matchedFrom = null;
    let matchedTo = null;

    for (const [lowerName, canonical] of skillLowerMap.entries()) {
      if (lowerName.includes(rule.from)) matchedFrom = canonical;
      if (lowerName.includes(rule.to)) matchedTo = canonical;
    }

    if (matchedFrom && matchedTo && matchedFrom !== matchedTo) {
      const alreadyExists = edges.some(
        (e) => e.fromSkill === matchedFrom && e.toSkill === matchedTo
      );
      if (!alreadyExists) {
        edges.push({
          fromSkill: matchedFrom,
          toSkill: matchedTo,
          type: rule.type,
          reason: rule.reason,
        });
      }
    }
  });

  return edges;
};
