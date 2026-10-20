import { ApiError } from '../utils/apiError.js';

export const MILESTONE_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  BLOCKED: 'BLOCKED',
};

/**
 * Generate a slug-safe identifier
 */
const slugify = (text = '') => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
};

/**
 * Deterministically generate milestones from roadmap skills, stages, and learning order
 */
export const generateInitialMilestones = (roadmap = {}, userSkills = []) => {
  const skills = roadmap.skills || [];
  const stages = roadmap.stages || [];
  const learningOrder = roadmap.learningOrder || [];
  const dependencyEdges = roadmap.dependencyEdges || [];

  if (!skills.length) {
    return [];
  }

  // Canonical skill map for case-insensitive lookup
  const skillMap = new Map();
  skills.forEach((s) => {
    if (s?.name) {
      skillMap.set(s.name.trim().toLowerCase(), s);
    }
  });

  // User verified skills map (from profile)
  const userSkillMap = new Map();
  (userSkills || []).forEach((us) => {
    if (us?.name) {
      userSkillMap.set(us.name.trim().toLowerCase(), us);
    }
  });

  // Track satisfied skills (only if verified in profile or high verified competency)
  const satisfiedSkills = new Set();
  skills.forEach((s) => {
    const lower = s.name.trim().toLowerCase();
    const profileMatch = userSkillMap.get(lower);
    const isProfileSatisfied = Boolean(
      profileMatch &&
      (profileMatch.level === 'advanced' || profileMatch.level === 'intermediate' || profileMatch.level === 'expert')
    );
    const isHighProficiency = s.currentLevel === 'advanced' || s.currentLevel === 'expert';
    if (isProfileSatisfied || isHighProficiency) {
      satisfiedSkills.add(lower);
    }
  });

  (learningOrder || []).forEach((lo) => {
    if (lo.status === 'SATISFIED') {
      satisfiedSkills.add(lo.skillName.trim().toLowerCase());
    }
  });

  // Edge prerequisites map: toSkill -> required fromSkills[]
  const requiredPrereqMap = new Map();
  skills.forEach((s) => requiredPrereqMap.set(s.name.trim().toLowerCase(), []));

  (dependencyEdges || []).forEach((e) => {
    if (e.type === 'REQUIRED') {
      const toLower = (e.toSkill || '').trim().toLowerCase();
      const fromLower = (e.fromSkill || '').trim().toLowerCase();
      if (requiredPrereqMap.has(toLower)) {
        requiredPrereqMap.get(toLower).push(fromLower);
      }
    }
  });

  // Order skills according to learningOrder if available, otherwise roadmap.skills order
  const orderedSkills = [];
  if (learningOrder.length > 0) {
    learningOrder.forEach((step) => {
      const found = skillMap.get(step.skillName.trim().toLowerCase());
      if (found && !orderedSkills.some((os) => os.name.toLowerCase() === found.name.toLowerCase())) {
        orderedSkills.push(found);
      }
    });
  }
  skills.forEach((s) => {
    if (!orderedSkills.some((os) => os.name.toLowerCase() === s.name.toLowerCase())) {
      orderedSkills.push(s);
    }
  });

  // Find which stage each skill belongs to
  const skillStageMap = new Map();
  stages.forEach((st) => {
    (st.skillNames || []).forEach((sn) => {
      skillStageMap.set(sn.trim().toLowerCase(), st.stageNumber || 1);
    });
  });

  const milestones = [];
  let globalOrderIndex = 1;

  // 1. Skill-level Milestones
  orderedSkills.forEach((skill) => {
    const skillLower = skill.name.trim().toLowerCase();
    const stageNum = skillStageMap.get(skillLower) || 1;
    const requiredPrereqs = requiredPrereqMap.get(skillLower) || [];

    // Canonical names of required prereqs
    const canonicalReqPrereqs = requiredPrereqs
      .map((r) => skillMap.get(r)?.name || r)
      .filter(Boolean);

    const isSkillSatisfied = satisfiedSkills.has(skillLower);
    const unmetPrereqs = requiredPrereqs.filter((r) => !satisfiedSkills.has(r));

    let defaultStatus = MILESTONE_STATUS.NOT_STARTED;
    let blockedReason = '';

    if (isSkillSatisfied) {
      defaultStatus = MILESTONE_STATUS.COMPLETED;
    } else if (unmetPrereqs.length > 0) {
      defaultStatus = MILESTONE_STATUS.BLOCKED;
      const unmetNames = unmetPrereqs.map((u) => skillMap.get(u)?.name || u).join(', ');
      blockedReason = `Blocked until required prerequisite skills (${unmetNames}) are completed.`;
    }

    const objectives = Array.isArray(skill.learningObjectives) && skill.learningObjectives.length > 0
      ? skill.learningObjectives
      : [
          `Master fundamental concepts and architectural syntax of ${skill.name}`,
          `Build hands-on practical project exercises in ${skill.name}`,
        ];

    objectives.forEach((obj, objIdx) => {
      const milestoneId = `ms_${slugify(skill.name)}_${objIdx + 1}`;
      milestones.push({
        milestoneId,
        title: `${skill.name}: ${obj}`,
        description: `Concrete learning milestone focused on mastering: ${obj}`,
        skillName: skill.name,
        stageNumber: stageNum,
        orderIndex: globalOrderIndex++,
        completionCriteria: [obj],
        requiredPrerequisites: canonicalReqPrereqs,
        recommendedPrerequisites: [],
        status: defaultStatus,
        priority: skill.priority || 'medium',
        learnerNotes: isSkillSatisfied ? 'Foundational competency verified from profile background.' : '',
        blockedReason: defaultStatus === MILESTONE_STATUS.BLOCKED ? blockedReason : '',
        startedAt: isSkillSatisfied ? new Date() : null,
        completedAt: isSkillSatisfied ? new Date() : null,
        isAdaptiveAddition: false,
      });
    });
  });

  // 2. Stage-level Capstone Milestones
  stages.forEach((stage) => {
    const stageSkills = (stage.skillNames || []).map((sn) => sn.trim().toLowerCase());
    const allStageSkillsSatisfied = stageSkills.length > 0 && stageSkills.every((sn) => satisfiedSkills.has(sn));

    const stagePrereqNames = (stage.skillNames || []).slice();
    const milestoneId = `ms_stage_${stage.stageNumber}_capstone`;

    milestones.push({
      milestoneId,
      title: `${stage.title}: Stage Capstone & Assessment`,
      description: stage.description || `Integrate competencies developed throughout Stage ${stage.stageNumber}.`,
      skillName: 'Stage Capstone',
      stageNumber: stage.stageNumber,
      orderIndex: globalOrderIndex++,
      completionCriteria: Array.isArray(stage.completionCriteria) && stage.completionCriteria.length > 0
        ? stage.completionCriteria
        : [`Deliver working stage project demonstrating competencies in ${stagePrereqNames.join(', ')}`],
      requiredPrerequisites: stagePrereqNames,
      recommendedPrerequisites: [],
      status: allStageSkillsSatisfied ? MILESTONE_STATUS.COMPLETED : MILESTONE_STATUS.BLOCKED,
      priority: 'high',
      learnerNotes: allStageSkillsSatisfied ? 'Stage capstone completed.' : '',
      blockedReason: allStageSkillsSatisfied ? '' : `Blocked until all focus skills in Stage ${stage.stageNumber} are completed.`,
      startedAt: allStageSkillsSatisfied ? new Date() : null,
      completedAt: allStageSkillsSatisfied ? new Date() : null,
      isAdaptiveAddition: false,
    });
  });

  return milestones;
};

/**
 * Calculate roadmap progress, unblock available milestones, and select next recommendation
 */
export const calculateRoadmapProgress = (milestones = [], skills = [], dependencyEdges = []) => {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return {
      progress: {
        totalMilestones: 0,
        completedMilestones: 0,
        inProgressMilestones: 0,
        blockedMilestones: 0,
        notStartedMilestones: 0,
        completionPercentage: 0,
        skillProgress: [],
        nextRecommendedMilestoneId: null,
        nextRecommendedMilestoneTitle: null,
        nextRecommendedReason: 'No milestones defined for this roadmap yet.',
        parallelAvailableMilestoneIds: [],
        lastActivityAt: null,
      },
      updatedMilestones: [],
    };
  }

  // Clone milestones to avoid direct mutation
  const updated = milestones.map((m) => (typeof m.toObject === 'function' ? m.toObject() : { ...m }));

  // Identify completed skills: a skill is completed if all its milestones are COMPLETED
  const skillMilestonesMap = new Map();
  updated.forEach((m) => {
    const key = (m.skillName || '').trim().toLowerCase();
    if (!skillMilestonesMap.has(key)) {
      skillMilestonesMap.set(key, []);
    }
    skillMilestonesMap.get(key).push(m);
  });

  const completedSkillSet = new Set();
  for (const [skillKey, mList] of skillMilestonesMap.entries()) {
    // Only check non-capstone milestones for skill completion
    const nonCapstones = mList.filter((m) => !m.milestoneId?.includes('capstone'));
    if (nonCapstones.length > 0 && nonCapstones.every((m) => m.status === MILESTONE_STATUS.COMPLETED)) {
      completedSkillSet.add(skillKey);
    }
  }

  // Edge prerequisites map
  const requiredEdgeMap = new Map();
  (dependencyEdges || []).forEach((e) => {
    if (e.type === 'REQUIRED') {
      const toKey = (e.toSkill || '').trim().toLowerCase();
      const fromKey = (e.fromSkill || '').trim().toLowerCase();
      if (!requiredEdgeMap.has(toKey)) requiredEdgeMap.set(toKey, []);
      requiredEdgeMap.get(toKey).push(fromKey);
    }
  });

  // Dynamically update blocker status for incomplete milestones
  updated.forEach((m) => {
    if (m.status === MILESTONE_STATUS.COMPLETED) {
      return;
    }

    const skillKey = (m.skillName || '').trim().toLowerCase();
    const explicitPrereqs = (m.requiredPrerequisites || []).map((r) => r.trim().toLowerCase());
    const edgePrereqs = requiredEdgeMap.get(skillKey) || [];

    const allPrereqs = Array.from(new Set([...explicitPrereqs, ...edgePrereqs]));
    const unmetPrereqs = allPrereqs.filter((r) => !completedSkillSet.has(r));

    if (unmetPrereqs.length === 0) {
      // All prerequisites satisfied!
      // Only unblock if it was blocked by prerequisites, preserving learner-reported obstacles
      const isPrereqBlocked =
        !m.blockedReason ||
        m.blockedReason.startsWith('Requires completion of prerequisite') ||
        m.blockedReason.startsWith('Blocked until');
      if (m.status === MILESTONE_STATUS.BLOCKED && isPrereqBlocked) {
        m.status = MILESTONE_STATUS.NOT_STARTED;
        m.blockedReason = '';
      }
    } else {
      // Has unmet prerequisites -> enforce BLOCKED status
      m.status = MILESTONE_STATUS.BLOCKED;
      m.blockedReason = `Requires completion of prerequisite skills: ${unmetPrereqs.join(', ')}`;
    }
  });

  // Calculate high-level metrics
  const total = updated.length;
  const completed = updated.filter((m) => m.status === MILESTONE_STATUS.COMPLETED).length;
  const inProgress = updated.filter((m) => m.status === MILESTONE_STATUS.IN_PROGRESS).length;
  const blocked = updated.filter((m) => m.status === MILESTONE_STATUS.BLOCKED).length;
  const notStarted = updated.filter((m) => m.status === MILESTONE_STATUS.NOT_STARTED).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Skill-by-skill progress breakdown
  const skillProgress = [];
  for (const [skillKey, mList] of skillMilestonesMap.entries()) {
    const sTotal = mList.length;
    const sCompleted = mList.filter((m) => m.status === MILESTONE_STATUS.COMPLETED).length;
    const sPct = sTotal > 0 ? Math.round((sCompleted / sTotal) * 100) : 0;
    skillProgress.push({
      skillName: mList[0]?.skillName || skillKey,
      totalMilestones: sTotal,
      completedMilestones: sCompleted,
      completionPercentage: sPct,
    });
  }

  // Select next actionable milestone:
  // 1. Any milestone currently IN_PROGRESS with lowest orderIndex
  // 2. Lowest orderIndex milestone that is NOT_STARTED and unblocked
  const inProgressList = updated
    .filter((m) => m.status === MILESTONE_STATUS.IN_PROGRESS)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const notStartedList = updated
    .filter((m) => m.status === MILESTONE_STATUS.NOT_STARTED)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  let nextMilestone = null;
  let nextReason = '';

  if (inProgressList.length > 0) {
    nextMilestone = inProgressList[0];
    nextReason = `Currently active milestone in progress: "${nextMilestone.title}". Continue hands-on practice.`;
  } else if (notStartedList.length > 0) {
    nextMilestone = notStartedList[0];
    nextReason = `Next logical milestone in sequence: all required prerequisites are satisfied and ready for execution.`;
  } else if (completed === total && total > 0) {
    nextReason = 'Outstanding achievement! All learning milestones for this roadmap have been completed.';
  } else if (blocked === total && total > 0) {
    nextReason = 'All remaining milestones are currently blocked by incomplete prerequisite dependencies.';
  } else {
    nextReason = 'Explore remaining learning milestones to continue your progress.';
  }

  // Find parallel actionable milestones (other unblocked milestones)
  const parallelMilestones = updated.filter(
    (m) =>
      (m.status === MILESTONE_STATUS.NOT_STARTED || m.status === MILESTONE_STATUS.IN_PROGRESS) &&
      m.milestoneId !== nextMilestone?.milestoneId
  );

  // Compute latest activity timestamp
  const activityDates = updated
    .map((m) => m.completedAt || m.startedAt || m.updatedAt)
    .filter(Boolean)
    .map((d) => new Date(d).getTime());

  const lastActivityAt = activityDates.length > 0 ? new Date(Math.max(...activityDates)) : null;

  const progress = {
    totalMilestones: total,
    completedCount: completed,
    completedMilestones: completed,
    inProgressCount: inProgress,
    inProgressMilestones: inProgress,
    blockedCount: blocked,
    blockedMilestones: blocked,
    remainingCount: notStarted + inProgress + blocked,
    notStartedMilestones: notStarted,
    completionPercentage: percentage,
    skillProgress,
    nextRecommendedMilestone: nextMilestone
      ? {
          milestoneId: nextMilestone.milestoneId,
          title: nextMilestone.title,
          skillName: nextMilestone.skillName,
          stageNumber: nextMilestone.stageNumber,
          reason: nextReason,
          actionLabel:
            nextMilestone.status === MILESTONE_STATUS.IN_PROGRESS
              ? 'Complete Milestone'
              : 'Start Milestone',
        }
      : null,
    nextRecommendedMilestoneId: nextMilestone ? nextMilestone.milestoneId : null,
    nextRecommendedMilestoneTitle: nextMilestone ? nextMilestone.title : null,
    nextRecommendedReason: nextReason,
    parallelEligibleMilestones: parallelMilestones.map((p) => ({
      milestoneId: p.milestoneId,
      title: p.title,
      skillName: p.skillName,
    })),
    parallelAvailableMilestoneIds: parallelMilestones.map((p) => p.milestoneId),
    lastActivityAt,
  };

  return { progress, updatedMilestones: updated };
};

/**
 * Handle state transition for a milestone
 */
export const updateMilestoneStatus = (roadmap, milestoneId, action, options = {}) => {
  if (!roadmap || !Array.isArray(roadmap.milestones)) {
    throw new ApiError(400, 'Invalid roadmap milestones data');
  }

  const milestoneIndex = roadmap.milestones.findIndex((m) => m.milestoneId === milestoneId);
  if (milestoneIndex === -1) {
    throw new ApiError(404, 'Milestone not found in this roadmap');
  }

  const milestone = roadmap.milestones[milestoneIndex];
  const upperAction = (action || '').toUpperCase();
  const noteVal = options.notes !== undefined ? options.notes : options.learnerNotes;

  switch (upperAction) {
    case 'START':
    case 'IN_PROGRESS':
      if (milestone.status === MILESTONE_STATUS.BLOCKED) {
        throw new ApiError(
          400,
          `Cannot start blocked milestone. ${milestone.blockedReason || 'Required prerequisites are not yet completed.'}`
        );
      }
      milestone.status = MILESTONE_STATUS.IN_PROGRESS;
      milestone.startedAt = milestone.startedAt || new Date();
      if (noteVal !== undefined) milestone.learnerNotes = noteVal;
      break;

    case 'COMPLETE':
      if (milestone.status === MILESTONE_STATUS.BLOCKED) {
        throw new ApiError(
          400,
          `Cannot complete blocked milestone. ${milestone.blockedReason || 'Required prerequisites are not yet completed.'}`
        );
      }
      milestone.status = MILESTONE_STATUS.COMPLETED;
      milestone.completedAt = new Date();
      if (noteVal !== undefined) milestone.learnerNotes = noteVal;
      break;

    case 'REOPEN':
      milestone.status = MILESTONE_STATUS.IN_PROGRESS;
      milestone.completedAt = null;
      if (noteVal !== undefined) milestone.learnerNotes = noteVal;
      break;

    case 'BLOCK':
    case 'REPORT_BLOCKER':
      milestone.status = MILESTONE_STATUS.BLOCKED;
      milestone.blockedReason = options.blockedReason || 'Learner reported a blocker or difficulty.';
      if (noteVal !== undefined) milestone.learnerNotes = noteVal;
      break;

    case 'UPDATE_NOTES':
      if (noteVal !== undefined) {
        milestone.learnerNotes = noteVal;
      }
      break;

    default:
      throw new ApiError(400, `Unsupported milestone action: "${action}". Valid actions: START, COMPLETE, REOPEN, BLOCK, REPORT_BLOCKER, UPDATE_NOTES.`);
  }

  // Recalculate whole roadmap progress and dynamically unblock/block downstream milestones
  const { progress, updatedMilestones } = calculateRoadmapProgress(
    roadmap.milestones,
    roadmap.skills,
    roadmap.dependencyEdges
  );

  roadmap.milestones = updatedMilestones;
  roadmap.progress = progress;
  roadmap.roadmapSchemaVersion = '2.3';

  return {
    roadmap,
    milestone: roadmap.milestones[milestoneIndex],
    progress,
  };
};

/**
 * Propose adaptive breakdown of a difficult or blocked milestone into smaller sub-steps
 */
export const proposeMilestoneBreakdown = (roadmap, milestoneId, userNote = '') => {
  const milestone = (roadmap.milestones || []).find((m) => m.milestoneId === milestoneId);
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found in this roadmap');
  }

  if (milestone.status === MILESTONE_STATUS.COMPLETED) {
    throw new ApiError(400, 'Cannot break down a milestone that is already completed');
  }

  const baseTitle = milestone.title.replace(/^[^:]+:\s*/, '');
  const skillName = milestone.skillName;

  const proposedSubMilestones = [
    {
      milestoneId: `${milestone.milestoneId}_sub1`,
      title: `${skillName}: Foundational Drill on ${baseTitle}`,
      description: `Breakdown step 1: Isolate syntax and core mental models for ${baseTitle}.`,
      completionCriteria: [`Review and document key concepts for ${baseTitle}`, `Complete guided interactive exercises`],
      skillName,
      stageNumber: milestone.stageNumber,
      orderIndex: milestone.orderIndex,
      status: MILESTONE_STATUS.NOT_STARTED,
      priority: 'high',
      isAdaptiveAddition: true,
      originalMilestoneId: milestone.milestoneId,
    },
    {
      milestoneId: `${milestone.milestoneId}_sub2`,
      title: `${skillName}: Sandbox Implementation of ${baseTitle}`,
      description: `Breakdown step 2: Build a focused, runnable prototype isolating ${baseTitle} in a sandbox environment.`,
      completionCriteria: [`Build standalone code implementation of ${baseTitle}`, `Verify error handling and core test cases`],
      skillName,
      stageNumber: milestone.stageNumber,
      orderIndex: milestone.orderIndex + 0.1,
      status: MILESTONE_STATUS.NOT_STARTED,
      priority: 'medium',
      isAdaptiveAddition: true,
      originalMilestoneId: milestone.milestoneId,
    },
    {
      milestoneId: `${milestone.milestoneId}_sub3`,
      title: `${skillName}: Peer Review & Project Integration for ${baseTitle}`,
      description: `Breakdown step 3: Integrate ${baseTitle} into your goal project and exchange code reviews with a peer.`,
      completionCriteria: [`Integrate ${baseTitle} into primary project branch`, `Validate completion with EnhanceUs peer mentor`],
      skillName,
      stageNumber: milestone.stageNumber,
      orderIndex: milestone.orderIndex + 0.2,
      status: MILESTONE_STATUS.NOT_STARTED,
      priority: 'high',
      isAdaptiveAddition: true,
      originalMilestoneId: milestone.milestoneId,
    },
  ];

  return {
    targetMilestone: milestone,
    proposedSubMilestones,
    subMilestones: proposedSubMilestones,
    summary: `Milestone "${milestone.title}" will be broken down into 3 targeted sub-milestones to de-risk complex concepts without losing completed progress.`,
  };
};

/**
 * Apply adaptive breakdown: replaces incomplete target milestone with sub-milestones
 */
export const applyMilestoneBreakdown = (roadmap, milestoneId, subMilestones = [], reason = '') => {
  const index = (roadmap.milestones || []).findIndex((m) => m.milestoneId === milestoneId);
  if (index === -1) {
    throw new ApiError(404, 'Milestone not found in this roadmap');
  }

  const target = roadmap.milestones[index];
  if (target.status === MILESTONE_STATUS.COMPLETED) {
    throw new ApiError(400, 'Cannot replace a completed milestone');
  }

  // Ensure proposed sub-milestones have valid fields
  const validatedSubMilestones = (subMilestones || []).map((sub, i) => ({
    milestoneId: sub.milestoneId || `${target.milestoneId}_sub${i + 1}`,
    title: sub.title || `${target.title} (Part ${i + 1})`,
    description: sub.description || target.description,
    skillName: target.skillName,
    stageNumber: target.stageNumber,
    orderIndex: target.orderIndex + i * 0.1,
    completionCriteria: Array.isArray(sub.completionCriteria) && sub.completionCriteria.length > 0 ? sub.completionCriteria : target.completionCriteria,
    requiredPrerequisites: target.requiredPrerequisites,
    recommendedPrerequisites: target.recommendedPrerequisites || [],
    status: MILESTONE_STATUS.NOT_STARTED,
    priority: sub.priority || target.priority || 'medium',
    learnerNotes: '',
    blockedReason: '',
    isAdaptiveAddition: true,
    originalMilestoneId: target.milestoneId,
  }));

  // Replace target milestone with sub-milestones
  roadmap.milestones.splice(index, 1, ...validatedSubMilestones);

  // Re-index all milestones cleanly (1, 2, 3...)
  roadmap.milestones.forEach((m, idx) => {
    m.orderIndex = idx + 1;
  });

  // Record historical event
  roadmap.adaptiveAdjustmentHistory = roadmap.adaptiveAdjustmentHistory || [];
  roadmap.adaptiveAdjustmentHistory.push({
    adjustedAt: new Date(),
    adjustmentType: 'BREAKDOWN_MILESTONE',
    originalMilestoneId: target.milestoneId,
    reason: reason || 'Learner requested adaptive breakdown of complex milestone.',
    affectedMilestoneIds: [milestoneId, ...validatedSubMilestones.map((s) => s.milestoneId)],
    summary: `Replaced milestone "${target.title}" with ${validatedSubMilestones.length} sub-milestones.`,
  });

  // Recalculate progress
  const { progress, updatedMilestones } = calculateRoadmapProgress(
    roadmap.milestones,
    roadmap.skills,
    roadmap.dependencyEdges
  );

  roadmap.milestones = updatedMilestones;
  roadmap.progress = progress;
  roadmap.roadmapSchemaVersion = '2.3';

  return {
    roadmap,
    newMilestones: validatedSubMilestones,
    progress,
  };
};

export default {
  MILESTONE_STATUS,
  generateInitialMilestones,
  calculateRoadmapProgress,
  updateMilestoneStatus,
  proposeMilestoneBreakdown,
  applyMilestoneBreakdown,
};
