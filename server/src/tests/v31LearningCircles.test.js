/**
 * EnhanceUs V3.1 — Learning Circles and Collaborative Learning Test Suite
 * 
 * Verifies:
 * 1. Circle creation, primary skill normalization, and initial owner assignment.
 * 2. Membership policies (OPEN instant join vs APPLY_TO_JOIN request queue vs INVITE_ONLY).
 * 3. Member limit enforcement and duplicate membership prevention.
 * 4. Role-based permissions (OWNER vs MODERATOR vs MEMBER) and privilege escalation guards.
 * 5. Collaborative roadmap milestones, individual task completion, and milestone completion.
 * 6. Group session scheduling, date validation, and duplicate RSVP prevention.
 * 7. Collaborative discussions, pinned announcements, and threaded replies.
 * 8. Leave circle safety (owner cannot leave without transfer) and circle closure.
 */

import * as circleService from '../services/circleService.js';
import { mockCirclesStore, mockCirclePostsStore } from '../services/circleService.js';
import { mockSessionsStore } from '../services/sessionService.js';

// Activate mock DB mode for in-memory testing
process.env.MOCK_DB = 'true';

async function runV31LearningCirclesTests() {
  console.log('====================================================');
  console.log('🌟 ENHANCEUS V3.1: LEARNING CIRCLES TEST SUITE');
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

  // Reset stores
  mockCirclesStore.length = 0;
  mockCirclePostsStore.length = 0;
  mockSessionsStore.length = 0;

  // Mock Users
  const userAlice = { _id: 'user_alice_01', name: 'Alice', email: 'alice@test.org' };
  const userBob = { _id: 'user_bob_02', name: 'Bob', email: 'bob@test.org' };
  const userCharlie = { _id: 'user_charlie_03', name: 'Charlie', email: 'charlie@test.org' };
  const userDavid = { _id: 'user_david_04', name: 'David', email: 'david@test.org' };

  // =========================================================================
  // SECTION 1: CIRCLE CREATION & SKILL NORMALIZATION
  // =========================================================================
  console.log('--- 1. Circle Creation & Validation ---');

  let circleOpen;
  try {
    circleOpen = await circleService.createCircle(userAlice._id, {
      title: 'Full Stack React & Node Study Group',
      description: 'Collaborative weekly circle for mastering modern web architectures.',
      primarySkill: 'reactjs', // Should normalize to 'React'
      secondarySkills: ['Node.js', 'Express.js', 'MongoDB'],
      learningObjectives: ['Build production MERN applications', 'Master state management'],
      skillLevel: 'INTERMEDIATE',
      memberLimit: 3, // Small limit for testing capacity
      membershipPolicy: 'OPEN',
    });

    assert(
      circleOpen.primarySkill === 'React',
      'Normalizes primary skill alias to canonical name (reactjs -> React)'
    );
    assert(
      circleOpen.owner.toString() === userAlice._id && circleOpen.members[0].role === 'OWNER',
      'Circle creator is designated as OWNER and enrolled as first member'
    );
    assert(
      circleOpen.memberLimit === 3,
      'Sets requested member limit (3 members)'
    );
  } catch (err) {
    assert(false, 'Create circle failed', err.message);
  }

  // Test validation: Missing title
  try {
    await circleService.createCircle(userAlice._id, {
      title: '',
      description: 'Test',
      primarySkill: 'Python',
    });
    assert(false, 'Should reject circle with missing title');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('title is required'),
      'Rejects circle creation with missing title (HTTP 400)'
    );
  }

  // =========================================================================
  // SECTION 2: MEMBERSHIP POLICIES (OPEN vs APPLY_TO_JOIN vs INVITE_ONLY)
  // =========================================================================
  console.log('\n--- 2. Membership Policies & Capacity Enforcement ---');

  // Bob joins OPEN circle
  try {
    const joinRes = await circleService.joinCircle(circleOpen._id, userBob._id);
    assert(
      joinRes.status === 'JOINED' && circleOpen.members.length === 2,
      'OPEN policy allows instant enrollment for authenticated member'
    );
  } catch (err) {
    assert(false, 'Bob join OPEN circle failed', err.message);
  }

  // Duplicate membership attempt
  try {
    await circleService.joinCircle(circleOpen._id, userBob._id);
    assert(false, 'Should prevent duplicate membership');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('already a member'),
      'Prevents duplicate member enrollment in same circle (HTTP 400)'
    );
  }

  // Charlie joins (reaching limit of 3)
  try {
    const joinCharlie = await circleService.joinCircle(circleOpen._id, userCharlie._id);
    assert(
      joinCharlie.status === 'JOINED' && circleOpen.members.length === 3,
      'Charlie joins OPEN circle, reaching capacity (3/3)'
    );
  } catch (err) {
    assert(false, 'Charlie join failed', err.message);
  }

  // David tries to join when capacity is full
  try {
    await circleService.joinCircle(circleOpen._id, userDavid._id);
    assert(false, 'Should reject join when capacity limit is reached');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('maximum capacity'),
      'Strictly blocks enrollment when member limit is reached (HTTP 400)'
    );
  }

  // Create APPLY_TO_JOIN circle
  let circleApply;
  try {
    circleApply = await circleService.createCircle(userAlice._id, {
      title: 'Advanced System Architecture Circle',
      description: 'Invitation & application circle for distributed systems.',
      primarySkill: 'Microservices',
      skillLevel: 'ADVANCED',
      memberLimit: 10,
      membershipPolicy: 'APPLY_TO_JOIN',
    });

    const applyRes = await circleService.joinCircle(circleApply._id, userDavid._id, {
      message: 'I have 3 years of backend experience and want to learn distributed patterns.',
    });

    assert(
      applyRes.status === 'REQUEST_SUBMITTED' && circleApply.joinRequests.length === 1,
      'APPLY_TO_JOIN policy creates pending join request instead of instant enrollment'
    );
  } catch (err) {
    assert(false, 'Apply to join failed', err.message);
  }

  // Duplicate join request prevention
  try {
    await circleService.joinCircle(circleApply._id, userDavid._id, { message: 'Again' });
    assert(false, 'Should prevent duplicate join request');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('pending join request'),
      'Prevents duplicate pending join requests from same user (HTTP 400)'
    );
  }

  // Moderator / Owner accepts join request
  try {
    const reqId = circleApply.joinRequests[0]._id;
    const acceptRes = await circleService.manageJoinRequest(circleApply._id, reqId, 'ACCEPT', userAlice._id);

    assert(
      acceptRes.status === 'ACCEPTED' && circleApply.members.some((m) => m.user === userDavid._id),
      'Owner accepts join request: updates status to ACCEPTED and adds user to members'
    );
  } catch (err) {
    assert(false, 'Accept join request failed', err.message);
  }

  // Create INVITE_ONLY circle and test access restriction
  let circlePrivate;
  try {
    circlePrivate = await circleService.createCircle(userAlice._id, {
      title: 'Executive Peer Circle',
      description: 'Private closed invite circle.',
      primarySkill: 'Leadership',
      membershipPolicy: 'INVITE_ONLY',
    });

    // Non-member (David) attempts to join
    try {
      await circleService.joinCircle(circlePrivate._id, userDavid._id);
      assert(false, 'INVITE_ONLY circle should reject direct join');
    } catch (err) {
      assert(
        err.statusCode === 403 && err.message.includes('invite-only'),
        'INVITE_ONLY circle strictly rejects direct join attempts (HTTP 403)'
      );
    }

    // Non-member attempts to get circle details
    try {
      await circleService.getCircleById(circlePrivate._id, userDavid._id);
      assert(false, 'INVITE_ONLY circle should restrict access to non-members');
    } catch (err) {
      assert(
        err.statusCode === 403 && err.message.includes('Access is restricted'),
        'INVITE_ONLY circle restricts unauthorized non-members from viewing details (HTTP 403)'
      );
    }
  } catch (err) {
    assert(false, 'Private circle test failed', err.message);
  }

  // =========================================================================
  // SECTION 3: ROLES, MODERATION & PRIVILEGE ESCALATION
  // =========================================================================
  console.log('\n--- 3. Roles, Moderation & Privilege Escalation Guards ---');

  // Alice (OWNER) appoints Bob as MODERATOR in circleOpen
  try {
    const roleRes = await circleService.updateMemberRole(circleOpen._id, userBob._id, 'MODERATOR', userAlice._id);
    assert(
      roleRes.role === 'MODERATOR' && circleOpen.members.find((m) => m.user === userBob._id)?.role === 'MODERATOR',
      'Owner appoints member as MODERATOR successfully'
    );
  } catch (err) {
    assert(false, 'Appoint moderator failed', err.message);
  }

  // Regular member (Charlie) attempts to appoint himself or someone else as moderator
  try {
    await circleService.updateMemberRole(circleOpen._id, userCharlie._id, 'MODERATOR', userCharlie._id);
    assert(false, 'Should prevent unauthorized role change by non-owner');
  } catch (err) {
    assert(
      err.statusCode === 403 && err.message.includes('Only the circle owner'),
      'Privilege escalation guard: Only OWNER can modify member roles (HTTP 403)'
    );
  }

  // Owner transfers ownership to Bob
  try {
    const transferRes = await circleService.updateMemberRole(circleOpen._id, userBob._id, 'OWNER', userAlice._id);
    assert(
      transferRes.role === 'OWNER' &&
        circleOpen.owner === userBob._id &&
        circleOpen.members.find((m) => m.user === userAlice._id)?.role === 'MODERATOR',
      'Ownership transfer: Bob becomes OWNER, Alice becomes MODERATOR'
    );
  } catch (err) {
    assert(false, 'Transfer ownership failed', err.message);
  }

  // =========================================================================
  // SECTION 4: COLLABORATIVE ROADMAP & MILESTONES
  // =========================================================================
  console.log('\n--- 4. Collaborative Roadmap, Milestones & Task Progress ---');

  let milestone1;
  try {
    milestone1 = await circleService.addCircleMilestone(
      circleOpen._id,
      {
        title: 'Master React Router v6 & Data Loaders',
        description: 'Complete routing architecture with nested layouts and protected route guards.',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completionCriteria: 'All circle members build and demo a multi-layout application.',
      },
      userBob._id // Bob is now owner
    );

    assert(
      milestone1.title === 'Master React Router v6 & Data Loaders' && milestone1.status === 'NOT_STARTED',
      'Adds shared collaborative milestone with target date and criteria'
    );
  } catch (err) {
    assert(false, 'Add milestone failed', err.message);
  }

  // Member adds actionable task to milestone
  let task1;
  try {
    task1 = await circleService.addMilestoneTask(
      circleOpen._id,
      milestone1._id,
      {
        title: 'Implement Auth Guard Loader',
        description: 'Create reusable ProtectedRoute component.',
        assignedTo: [userCharlie._id],
        linkUrl: 'https://github.com/react-demo',
      },
      userCharlie._id
    );

    assert(
      task1.title === 'Implement Auth Guard Loader' && !task1.isCompleted,
      'Circle member adds actionable task to collaborative milestone'
    );
  } catch (err) {
    assert(false, 'Add task failed', err.message);
  }

  // Charlie toggles task completion
  try {
    const updatedTask = await circleService.toggleMilestoneTask(
      circleOpen._id,
      milestone1._id,
      task1._id,
      userCharlie._id
    );

    assert(
      updatedTask.isCompleted && updatedTask.completedBy.includes(userCharlie._id),
      'Member toggles task complete: updates completedBy array and status'
    );
  } catch (err) {
    assert(false, 'Toggle task failed', err.message);
  }

  // Moderator/Owner updates overall milestone to COMPLETED
  try {
    const updatedMs = await circleService.updateCircleMilestone(
      circleOpen._id,
      milestone1._id,
      { status: 'COMPLETED' },
      userBob._id
    );

    assert(
      updatedMs.status === 'COMPLETED' && updatedMs.completedAt != null,
      'Owner marks milestone as COMPLETED with timestamp'
    );
  } catch (err) {
    assert(false, 'Update milestone status failed', err.message);
  }

  // =========================================================================
  // SECTION 5: GROUP SESSIONS & RSVP MANAGEMENT
  // =========================================================================
  console.log('\n--- 5. Group Sessions & RSVP Management ---');

  let groupSession;
  try {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    groupSession = await circleService.proposeGroupSession(
      circleOpen._id,
      {
        title: 'Live Pair Programming: React Hooks Architecture',
        description: 'Collaborative coding session exploring custom hooks and performance optimization.',
        date: futureDate,
        time: '18:00',
        durationMinutes: 90,
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
        maxParticipants: 5,
      },
      userBob._id
    );

    assert(
      groupSession.isGroupSession === true &&
        groupSession.circle.toString() === circleOpen._id.toString() &&
        groupSession.rsvps[0].user === userBob._id &&
        groupSession.rsvps[0].status === 'GOING',
      'Proposes group session and automatically RSVPs host as GOING'
    );
  } catch (err) {
    assert(false, 'Propose group session failed', err.message);
  }

  // Charlie RSVPs to the session
  try {
    const rsvpRes = await circleService.rsvpGroupSession(
      groupSession._id,
      userCharlie._id,
      'GOING',
      'Looking forward to exploring useMemo!'
    );

    const charlieRsvp = rsvpRes.rsvps.find((r) => r.user === userCharlie._id);
    assert(
      charlieRsvp && charlieRsvp.status === 'GOING' && rsvpRes.participants.includes(userCharlie._id),
      'Circle member successfully RSVPs GOING and syncs participants'
    );
  } catch (err) {
    assert(false, 'RSVP group session failed', err.message);
  }

  // Non-member (David) attempts to RSVP to circle session
  try {
    await circleService.rsvpGroupSession(groupSession._id, userDavid._id, 'GOING');
    assert(false, 'Non-member should not be allowed to RSVP');
  } catch (err) {
    assert(
      err.statusCode === 403 && err.message.includes('member of the circle'),
      'Blocks non-member from RSVPing to circle group session (HTTP 403)'
    );
  }

  // Charlie changes RSVP to NOT_GOING
  try {
    const updatedRsvp = await circleService.rsvpGroupSession(
      groupSession._id,
      userCharlie._id,
      'NOT_GOING'
    );

    const charlieRsvp = updatedRsvp.rsvps.find((r) => r.user === userCharlie._id);
    assert(
      charlieRsvp.status === 'NOT_GOING' && !updatedRsvp.participants.includes(userCharlie._id),
      'Member updates RSVP to NOT_GOING: removes from active participants list'
    );
  } catch (err) {
    assert(false, 'Update RSVP failed', err.message);
  }

  // =========================================================================
  // SECTION 6: DISCUSSIONS & ANNOUNCEMENTS
  // =========================================================================
  console.log('\n--- 6. Discussions, Announcements & Replies ---');

  let announcementPost;
  try {
    announcementPost = await circleService.createCirclePost(
      circleOpen._id,
      userBob._id, // Owner
      {
        title: 'Circle Kickoff & Weekly Meeting Cadence',
        content: 'Welcome everyone! We will be meeting every Thursday at 6pm UTC.',
        isAnnouncement: true,
        isPinned: true,
      }
    );

    assert(
      announcementPost.isAnnouncement === true && announcementPost.isPinned === true,
      'Owner creates pinned announcement post'
    );
  } catch (err) {
    assert(false, 'Create announcement failed', err.message);
  }

  // Regular member attempts to create announcement (should be demoted to regular post)
  try {
    const regularPost = await circleService.createCirclePost(
      circleOpen._id,
      userCharlie._id,
      {
        title: 'Great article on useEffect best practices',
        content: 'Sharing this resource with the circle: https://react.dev/learn',
        isAnnouncement: true, // Should be ignored for non-moderators
        isPinned: true,       // Should be ignored for non-moderators
      }
    );

    assert(
      regularPost.isAnnouncement === false && regularPost.isPinned === false,
      'Non-moderator cannot create pinned announcements; automatically set to regular discussion'
    );
  } catch (err) {
    assert(false, 'Create regular post failed', err.message);
  }

  // Add reply to discussion
  try {
    const replyRes = await circleService.addPostReply(
      circleOpen._id,
      announcementPost._id,
      userCharlie._id,
      'Excited to collaborate! See you on Thursday.'
    );

    assert(
      replyRes.content.includes('Excited to collaborate'),
      'Member posts reply to discussion thread successfully'
    );
  } catch (err) {
    assert(false, 'Add reply failed', err.message);
  }

  // Delete post permission check
  try {
    // Non-author (Alice, who is currently moderator) can delete post
    const delRes = await circleService.deleteCirclePost(
      circleOpen._id,
      announcementPost._id,
      userAlice._id
    );
    assert(delRes.success === true, 'Moderator can moderate and delete discussion posts');
  } catch (err) {
    assert(false, 'Moderator delete post failed', err.message);
  }

  // =========================================================================
  // SECTION 7: LEAVE CIRCLE & CIRCLE CLOSURE
  // =========================================================================
  console.log('\n--- 7. Leave Circle & Closure Controls ---');

  // Charlie leaves circle
  try {
    const leaveRes = await circleService.leaveCircle(circleOpen._id, userCharlie._id);
    assert(
      leaveRes.success && !circleOpen.members.some((m) => m.user === userCharlie._id),
      'Regular member leaves circle successfully'
    );
  } catch (err) {
    assert(false, 'Leave circle failed', err.message);
  }

  // Owner (Bob) attempts to leave without transferring ownership (Alice is still a member)
  try {
    await circleService.leaveCircle(circleOpen._id, userBob._id);
    assert(false, 'Owner should not be allowed to leave without transferring ownership');
  } catch (err) {
    assert(
      err.statusCode === 400 && err.message.includes('transfer ownership'),
      'Prevents owner from leaving circle without transferring ownership (HTTP 400)'
    );
  }

  // Bob (Owner) closes the circle
  try {
    const closeRes = await circleService.closeCircle(circleOpen._id, userBob._id);
    assert(
      closeRes.status === 'CLOSED' && circleOpen.status === 'CLOSED',
      'Owner can close circle with proper confirmation'
    );
  } catch (err) {
    assert(false, 'Close circle failed', err.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log(`🏁 V3.1 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runV31LearningCirclesTests().catch((err) => {
  console.error('Fatal error in V3.1 test suite:', err);
  process.exit(1);
});
