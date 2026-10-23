/**
 * EnhanceUs V3.0 — Intelligent Skill Matching and Proof-of-Skill Portfolio Test Suite
 * 
 * Verifies:
 * 1. Skill normalizer, alias canonicalization, and level compatibility.
 * 2. Deterministic reciprocal vs partial match scoring and explainable breakdown.
 * 3. Incomplete profile safety, division-by-zero resilience, and newcomer reliability baseline.
 * 4. Portfolio CRUD, verification tier calculation (SELF_REPORTED vs PORTFOLIO_EVIDENCE).
 * 5. Anti-forgery protection (blocking client-assigned EXCHANGE_CONFIRMED).
 * 6. Visibility scoping (PUBLIC vs MEMBERS_ONLY vs PRIVATE).
 * 7. Legitimate session-verified exchange confirmation and duplicate prevention.
 * 8. Milestone to portfolio import flow.
 */

import {
  normalizeSkillName,
  areSkillsCompatible,
  calculateProficiencyCompatibility,
} from '../utils/skillNormalizer.js';
import {
  calculateMatchScore,
  MATCH_WEIGHTS,
} from '../services/matchingService.js';
import * as portfolioService from '../services/portfolioService.js';
import { mockPortfolioStore } from '../services/portfolioService.js';
import { mockSessionsStore } from '../services/sessionService.js';

// Activate mock DB mode for in-memory testing
process.env.MOCK_DB = 'true';

async function runV3MatchingAndPortfolioTests() {
  console.log('====================================================');
  console.log('⚡ ENHANCEUS V3.0: MATCHING & PORTFOLIO TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, extra = '') => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extra}`);
      failed++;
    }
  };

  // =========================================================================
  // SECTION 1: SKILL NORMALIZER & CANONICAL ALIAS ENGINE
  // =========================================================================
  console.log('--- 1. Skill Normalizer & Canonical Alias Engine ---');

  assert(
    normalizeSkillName('reactjs') === 'React' &&
      normalizeSkillName('react.js') === 'React' &&
      normalizeSkillName('REACT') === 'React',
    'Normalizes React aliases (reactjs, react.js, REACT) -> React'
  );

  assert(
    normalizeSkillName('k8s') === 'Kubernetes' &&
      normalizeSkillName('py') === 'Python' &&
      normalizeSkillName('golang') === 'Go' &&
      normalizeSkillName('ts') === 'TypeScript',
    'Normalizes common industry shortcodes (k8s, py, golang, ts)'
  );

  assert(
    areSkillsCompatible('React.js', 'React') &&
      areSkillsCompatible('Node.js', 'nodejs') &&
      areSkillsCompatible('Full Stack React Native', 'React Native'),
    'areSkillsCompatible detects equivalence across aliases and substrings'
  );

  assert(
    !areSkillsCompatible('React', 'Python') && !areSkillsCompatible('Docker', 'Rust'),
    'areSkillsCompatible correctly differentiates non-matching skills'
  );

  assert(
    calculateProficiencyCompatibility('EXPERT', 'BEGINNER') === 100 &&
      calculateProficiencyCompatibility('INTERMEDIATE', 'INTERMEDIATE') === 85 &&
      calculateProficiencyCompatibility('BEGINNER', 'ADVANCED') === 25,
    'Proficiency compatibility scores levels accurately (Teacher > Learner = 100, Peer = 85, Deficit = 25)'
  );

  // =========================================================================
  // SECTION 2: RECIPROCAL VS PARTIAL MATCH SCORING
  // =========================================================================
  console.log('\n--- 2. Deterministic Reciprocal vs Partial Match Scoring ---');

  const userAlice = {
    _id: 'user_alice_01',
    name: 'Alice',
    skills: [{ name: 'React', level: 'ADVANCED', type: 'TEACH' }],
    learningInterests: [{ name: 'Node.js', priority: 'HIGH' }],
    availability: 'flexible',
    reputation: { averageRating: 4.9, reviewCount: 5 },
    sessionsCompleted: 4,
  };

  const candidateBob = {
    _id: 'user_bob_02',
    name: 'Bob',
    skills: [{ name: 'Node.js', level: 'ADVANCED', type: 'TEACH' }],
    learningInterests: [{ name: 'React', priority: 'HIGH' }],
    availability: 'flexible',
    reputation: { averageRating: 5.0, reviewCount: 8 },
    sessionsCompleted: 6,
  };

  // Alice and Bob have mutual 2-way exchange symmetry
  const reciprocalMatch = calculateMatchScore(userAlice, candidateBob, null);

  assert(
    reciprocalMatch.matchType === 'RECIPROCAL_EXCHANGE',
    'Identifies balanced 2-way symmetry as RECIPROCAL_EXCHANGE'
  );
  assert(
    reciprocalMatch.overallScore >= 80,
    `Reciprocal exchange fit score is high (${reciprocalMatch.overallScore}%)`
  );
  assert(
    reciprocalMatch.scoreBreakdown?.reciprocityScore === 100,
    'Reciprocity score is 100% when bilateral match is symmetric'
  );
  assert(
    reciprocalMatch.explanation.some((e) => e.includes('Reciprocal exchange')),
    'Includes explainable reciprocal justification checklist item'
  );

  // One-way scenario: Bob can teach Alice, but Alice teaches something Bob does NOT want
  const candidateCharlie = {
    _id: 'user_charlie_03',
    name: 'Charlie',
    skills: [{ name: 'Node.js', level: 'INTERMEDIATE', type: 'TEACH' }],
    learningInterests: [{ name: 'Rust', priority: 'HIGH' }], // Alice does not offer Rust
    availability: 'flexible',
    reputation: { averageRating: 4.8, reviewCount: 3 },
    sessionsCompleted: 2,
  };

  const partialMatch = calculateMatchScore(userAlice, candidateCharlie, null);

  assert(
    partialMatch.matchType === 'PARTIAL_MATCH',
    'Identifies one-way skill coverage as PARTIAL_MATCH'
  );
  assert(
    partialMatch.scoreBreakdown?.reciprocityScore < 50,
    `Reciprocity score is penalized (${partialMatch.scoreBreakdown?.reciprocityScore}%) for asymmetric match`
  );
  assert(
    partialMatch.overallScore < reciprocalMatch.overallScore,
    'Partial match overall score is lower than balanced reciprocal match'
  );

  // =========================================================================
  // SECTION 3: INCOMPLETE PROFILES & NEWCOMER RESILIENCE
  // =========================================================================
  console.log('\n--- 3. Incomplete Profiles & Newcomer Resilience ---');

  const emptyUser = {
    _id: 'user_empty_04',
    name: 'Empty Profile User',
    skills: [],
    learningInterests: [],
  };

  const emptyCandidate = {
    _id: 'user_empty_05',
    name: 'Empty Candidate',
    skills: [],
    learningInterests: [],
  };

  const emptyScore = calculateMatchScore(emptyUser, emptyCandidate, null);
  assert(
    !isNaN(emptyScore.overallScore) && emptyScore.overallScore >= 0 && emptyScore.overallScore <= 100,
    'Empty profiles do not produce NaN or unhandled division-by-zero crashes'
  );

  // Newcomer candidate with 0 ratings
  const newcomerCandidate = {
    _id: 'user_newcomer_06',
    name: 'Newcomer Dave',
    skills: [{ name: 'Node.js', level: 'INTERMEDIATE', type: 'TEACH' }],
    learningInterests: [{ name: 'React', priority: 'HIGH' }],
    availability: 'flexible',
    reputation: { averageRating: 5.0, reviewCount: 0 },
    sessionsCompleted: 0,
  };

  const newcomerScore = calculateMatchScore(userAlice, newcomerCandidate, null);
  assert(
    newcomerScore.scoreBreakdown?.reliabilityScore === 90,
    'Newcomer safe reliability score defaults to fair 90/100 baseline'
  );
  assert(
    newcomerScore.explanation.some((e) => e.includes('newcomer')),
    'Includes supportive newcomer justification in checklist'
  );

  // =========================================================================
  // SECTION 4: PROOF-OF-SKILL PORTFOLIO CRUD & VERIFICATION TIERS
  // =========================================================================
  console.log('\n--- 4. Proof-of-Skill Portfolio Engine & Verification Tiers ---');

  // Clear mock store
  mockPortfolioStore.length = 0;

  // Test 4A: Self-reported item (no URL)
  let itemSelfReported;
  try {
    itemSelfReported = await portfolioService.createPortfolioItem('user_alice_01', {
      title: 'React Dashboard Component',
      description: 'Built a responsive analytics dashboard with state hooks.',
      skillName: 'reactjs', // should normalize to 'React'
      category: 'Frontend',
      itemType: 'CODE_REPOSITORY',
      evidenceUrl: '', // No external proof
      visibility: 'PUBLIC',
    });

    assert(
      itemSelfReported.verificationStatus === 'SELF_REPORTED',
      'Item with empty evidenceUrl defaults to SELF_REPORTED tier'
    );
    assert(
      itemSelfReported.skillName === 'React',
      'Associated skill name is automatically normalized to canonical form (React)'
    );
  } catch (err) {
    assert(false, 'Create self-reported item failed', err.message);
  }

  // Test 4B: Evidence-backed item (with URL)
  let itemEvidenceBacked;
  try {
    itemEvidenceBacked = await portfolioService.createPortfolioItem('user_alice_01', {
      title: 'Production REST API',
      description: 'Designed Express REST endpoints with rate limiting and tests.',
      skillName: 'Node.js',
      category: 'Backend',
      itemType: 'PROJECT',
      evidenceUrl: 'https://github.com/alice/production-api',
      visibility: 'MEMBERS_ONLY',
    });

    assert(
      itemEvidenceBacked.verificationStatus === 'PORTFOLIO_EVIDENCE',
      'Item with valid external evidence URL automatically earns PORTFOLIO_EVIDENCE tier'
    );
  } catch (err) {
    assert(false, 'Create evidence-backed item failed', err.message);
  }

  // Test 4C: Private portfolio item
  try {
    await portfolioService.createPortfolioItem('user_alice_01', {
      title: 'Personal Study Notes',
      description: 'Private roadmap notes for algorithm preparation.',
      skillName: 'Algorithms',
      category: 'General',
      itemType: 'CERTIFICATION',
      evidenceUrl: '',
      visibility: 'PRIVATE',
    });
    assert(true, 'Successfully created PRIVATE portfolio item');
  } catch (err) {
    assert(false, 'Create private item failed', err.message);
  }

  // =========================================================================
  // SECTION 5: ANTI-FORGERY SECURITY PROTECTION
  // =========================================================================
  console.log('\n--- 5. Anti-Forgery Security Protection ---');

  try {
    await portfolioService.createPortfolioItem('user_alice_01', {
      title: 'Forged Exchange Achievement',
      description: 'Attempting to claim exchange-confirmed without an actual session.',
      skillName: 'Python',
      category: 'Backend',
      verificationStatus: 'EXCHANGE_CONFIRMED', // FORGERY ATTEMPT
    });
    assert(false, 'Anti-forgery failed: Allowed client to claim EXCHANGE_CONFIRMED directly');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('Exchange-confirmed'),
      'Anti-forgery guard rejects unauthorized self-claim of EXCHANGE_CONFIRMED (HTTP 400)'
    );
  }

  // =========================================================================
  // SECTION 6: VISIBILITY SCOPING (PUBLIC vs MEMBERS_ONLY vs PRIVATE)
  // =========================================================================
  console.log('\n--- 6. Portfolio Visibility Scoping & Access Control ---');

  // Alice is the owner
  const ownerView = await portfolioService.getUserPortfolio('user_alice_01', 'user_alice_01');
  assert(
    ownerView.items.length === 3,
    `Owner views all items including PRIVATE (expected 3, got ${ownerView.items.length})`
  );

  // Authenticated peer (Bob)
  const memberView = await portfolioService.getUserPortfolio('user_alice_01', 'user_bob_02');
  const hasPrivateInMember = memberView.items.some((i) => i.visibility === 'PRIVATE');
  assert(
    memberView.items.length === 2 && !hasPrivateInMember,
    'Authenticated member views PUBLIC and MEMBERS_ONLY items, but PRIVATE items are strictly filtered'
  );

  // Unauthenticated public guest
  const guestView = await portfolioService.getUserPortfolio('user_alice_01', null);
  const onlyPublic = guestView.items.every((i) => i.visibility === 'PUBLIC');
  assert(
    guestView.items.length === 1 && onlyPublic,
    'Unauthenticated guest only views PUBLIC items (MEMBERS_ONLY and PRIVATE strictly hidden)'
  );

  // =========================================================================
  // SECTION 7: LEGITIMATE EXCHANGE CONFIRMATION & SESSION VERIFICATION
  // =========================================================================
  console.log('\n--- 7. Legitimate Exchange Confirmation & Session Verification ---');

  mockSessionsStore.length = 0;

  // Add a completed session between Alice and Bob
  const completedSession = {
    _id: 'session_real_101',
    participants: ['user_alice_01', 'user_bob_02'],
    skillTaught: 'React',
    status: 'COMPLETED',
    date: '2026-10-20',
    time: '14:00',
  };
  mockSessionsStore.push(completedSession);

  // Non-participant attempt
  try {
    await portfolioService.confirmExchangePortfolioOutcome('user_charlie_03', {
      sessionId: 'session_real_101',
      title: 'Charlie Claiming Alice Session',
    });
    assert(false, 'Should reject non-participant confirmation');
  } catch (err) {
    assert(
      err.statusCode === 403,
      'Rejects non-participant from claiming confirmation for someone else session (HTTP 403)'
    );
  }

  // Alice confirms legitimate outcome
  let confirmedItem;
  try {
    confirmedItem = await portfolioService.confirmExchangePortfolioOutcome('user_alice_01', {
      sessionId: 'session_real_101',
      title: 'React Component Architecture Peer Exchange',
      description: 'Completed 1-on-1 reciprocal session teaching React hooks and component trees.',
      evidenceUrl: 'https://github.com/alice/shared-exchange-code',
      visibility: 'PUBLIC',
    });

    assert(
      confirmedItem.verificationStatus === 'EXCHANGE_CONFIRMED',
      'Legitimate completed session generates verified EXCHANGE_CONFIRMED artifact'
    );
    assert(
      confirmedItem.peerReviewer === 'user_bob_02',
      'Links peer reviewer ID (Bob) for auditability and proof'
    );
  } catch (err) {
    assert(false, 'Legitimate exchange confirmation failed', err.message);
  }

  // Duplicate attempt on the same session
  try {
    await portfolioService.confirmExchangePortfolioOutcome('user_alice_01', {
      sessionId: 'session_real_101',
      title: 'Duplicate Claim',
    });
    assert(false, 'Should reject duplicate confirmation for the same session');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('already been generated'),
      'Prevents duplicate confirmation creation for the same session (HTTP 400)'
    );
  }

  // Incomplete session attempt
  const incompleteSession = {
    _id: 'session_scheduled_102',
    participants: ['user_alice_01', 'user_bob_02'],
    skillTaught: 'GraphQL',
    status: 'SCHEDULED', // NOT completed
  };
  mockSessionsStore.push(incompleteSession);

  try {
    await portfolioService.confirmExchangePortfolioOutcome('user_alice_01', {
      sessionId: 'session_scheduled_102',
    });
    assert(false, 'Should reject uncompleted session confirmation');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('must be marked COMPLETED'),
      'Rejects SCHEDULED/INCOMPLETE session from being confirmed (HTTP 400)'
    );
  }

  // =========================================================================
  // SECTION 8: MILESTONE IMPORT FLOW
  // =========================================================================
  console.log('\n--- 8. Milestone to Proof-of-Skill Import Flow ---');

  const { mockRoadmapsStore } = await import('../services/roadmapService.js').catch(() => ({ mockRoadmapsStore: [] }));
  const testRoadmap = {
    _id: 'roadmap_v3_test_1',
    user: 'user_alice_01',
    title: 'Full Stack Mastery',
    milestones: [
      {
        milestoneId: 'ms_completed_1',
        title: 'Master Redux Toolkit',
        skillName: 'Redux',
        status: 'COMPLETED',
      },
    ],
  };
  mockRoadmapsStore.push(testRoadmap);

  try {
    const milestoneItem = await portfolioService.createPortfolioFromMilestone('user_alice_01', {
      roadmapId: 'roadmap_v3_test_1',
      milestoneId: 'ms_completed_1',
      evidenceUrl: 'https://github.com/alice/redux-toolkit-sample',
      visibility: 'PUBLIC',
    });

    assert(
      milestoneItem.skillName === 'Redux' &&
        milestoneItem.itemType === 'LEARNING_MILESTONE' &&
        milestoneItem.verificationStatus === 'PORTFOLIO_EVIDENCE',
      'One-click milestone import successfully publishes verified evidence-backed portfolio item'
    );
  } catch (err) {
    assert(false, 'Milestone import failed', err.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log(`🏁 V3.0 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runV3MatchingAndPortfolioTests().catch((err) => {
  console.error('Fatal error in V3.0 test suite:', err);
  process.exit(1);
});
