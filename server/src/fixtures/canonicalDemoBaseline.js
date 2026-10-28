/**
 * Authoritative Canonical Demo Baseline Fixture
 * Version: 3.3.0
 * 
 * Deterministic, realistic sample dataset covering all EnhanceUs features:
 * - Profile & Skills
 * - Goals & Skill Gaps
 * - Roadmaps & Dependency-Ordered Milestones
 * - AI Learning Coach Recommendations & Rationale
 * - Reciprocal Skill Matches & Explanations
 * - Learning Circles & Discussions
 * - Sessions (Completed & Scheduled)
 * - Real-Time Simulated Conversations & Notifications
 * - Proof-of-Skill Portfolio Items (Verified & Self-Reported)
 * - Auditable Trust & Contribution Metrics
 * - Privacy-Preserving Community Insights
 * 
 * CRITICAL RULE: This object must be treated as immutable.
 * Always clone via getCanonicalBaseline() before mutating in a workspace.
 */

export const BASELINE_VERSION = '3.7.0';

export const DEMO_USER_ID = 'demo_user_canonical_001';
export const DEMO_PEER_ID = 'demo_peer_sarah_002';
export const DEMO_PEER_MARCUS_ID = 'demo_peer_marcus_003';

export const CANONICAL_DEMO_BASELINE = {
  version: BASELINE_VERSION,

  // 1. Primary Demo User Profile
  profile: {
    _id: DEMO_USER_ID,
    name: 'Alex Morgan',
    email: 'demo@enhanceus.org',
    role: 'user',
    isDemo: true,
    emailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    bio: 'Full-stack software engineer passionate about modern React architectures, TypeScript, and AI-assisted workflows. Looking to learn Figma UI/UX design in exchange for frontend mentorship.',
    availability: 'flexible',
    timezone: 'America/New_York',
    experienceLevel: 'ADVANCED',
    preferredLearningStyle: 'hands_on',
    onboardingCompletedAt: '2026-10-01T10:00:00.000Z',
    dismissedOnboardingAt: null,
    notificationPreferences: {
      sessionUpdates: true,
      goalReminders: true,
      peerActivity: true,
      circleActivity: true,
      platformAnnouncements: true,
      emailNotifications: true,
    },
    sessionsCompleted: 4,
    hoursTaught: 14,
    hoursLearned: 12,
    exchangesCompleted: 3,
    reputation: {
      averageRating: 5.0,
      reviewCount: 4,
    },
    skills: [
      {
        name: 'React',
        level: 'ADVANCED',
        category: 'Frontend',
        type: 'TEACH',
        evidence: {
          portfolioUrl: 'https://github.com/alexmorgan/react-flow-builder',
          certificateUrl: 'https://credentials.meta.org/verify/react-pro-9821',
          workSampleUrl: 'https://alexmorgan.dev/showcase/react',
          description: '5+ years building scalable React 18 production applications with custom state hooks and performance profiling.',
          verificationStatus: 'VERIFIED',
          submittedAt: '2026-09-20T10:00:00.000Z',
          reviewedAt: '2026-09-22T14:30:00.000Z',
          reviewedBy: 'admin_reviewer_001',
          reviewerNotes: 'Verified open-source repository code quality, architecture patterns, and authenticated credential hash.',
          rejectionReason: '',
        },
      },
      {
        name: 'TypeScript',
        level: 'ADVANCED',
        category: 'Frontend',
        type: 'TEACH',
        evidence: {
          portfolioUrl: 'https://github.com/alexmorgan/typed-toolkit',
          workSampleUrl: 'https://alexmorgan.dev/showcase/typescript',
          certificateUrl: '',
          description: 'Author of open-source TypeScript utility toolkit with 500+ GitHub stars; extensive experience with complex generics.',
          verificationStatus: 'SUBMITTED',
          submittedAt: '2026-10-15T09:00:00.000Z',
          reviewedAt: null,
          reviewedBy: null,
          reviewerNotes: '',
          rejectionReason: '',
        },
      },
      {
        name: 'Node.js',
        level: 'INTERMEDIATE',
        category: 'Backend',
        type: 'TEACH',
        evidence: {
          portfolioUrl: 'https://github.com/alexmorgan/express-microservices',
          certificateUrl: '',
          workSampleUrl: '',
          description: 'Built REST APIs, JWT authentication middlewares, and MongoDB services for web applications.',
          verificationStatus: 'NOT_SUBMITTED',
          submittedAt: null,
          reviewedAt: null,
          reviewedBy: null,
          reviewerNotes: '',
          rejectionReason: '',
        },
      },
      {
        name: 'TailwindCSS',
        level: 'ADVANCED',
        category: 'Frontend',
        type: 'TEACH',
        evidence: {
          portfolioUrl: '',
          certificateUrl: '',
          workSampleUrl: '',
          description: '',
          verificationStatus: 'NOT_SUBMITTED',
          submittedAt: null,
          reviewedAt: null,
          reviewedBy: null,
          reviewerNotes: '',
          rejectionReason: '',
        },
      },
    ],
    learningInterests: [
      { name: 'UI/UX Design', category: 'Design', priority: 'HIGH' },
      { name: 'Figma Prototyping', category: 'Design', priority: 'HIGH' },
      { name: 'Cloud Architecture & DevOps', category: 'Infrastructure', priority: 'MEDIUM' },
    ],
    createdAt: '2026-09-15T10:00:00.000Z',
  },

  // 2. Fictional Demo Peers
  peers: [
    {
      _id: DEMO_PEER_ID,
      name: 'Sarah Chen',
      email: 'sarah.demo@enhanceus.org',
      role: 'user',
      isDemo: true,
      emailVerified: true,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
      bio: 'Principal Product Designer at DesignWave. Specializing in design systems, micro-interactions, and user research. Eager to level up in TypeScript and modern React.',
      availability: 'flexible',
      timezone: 'America/New_York',
      experienceLevel: 'EXPERT',
      preferredLearningStyle: 'collaborative',
      sessionsCompleted: 6,
      hoursTaught: 20,
      hoursLearned: 8,
      exchangesCompleted: 4,
      reputation: {
        averageRating: 4.9,
        reviewCount: 7,
      },
      skills: [
        { name: 'UI/UX Design', level: 'EXPERT', category: 'Design', type: 'TEACH' },
        { name: 'Figma Prototyping', level: 'ADVANCED', category: 'Design', type: 'TEACH' },
        { name: 'Design Systems', level: 'ADVANCED', category: 'Design', type: 'TEACH' },
      ],
      learningInterests: [
        { name: 'React', category: 'Frontend', priority: 'HIGH' },
        { name: 'TypeScript', category: 'Frontend', priority: 'HIGH' },
      ],
    },
    {
      _id: DEMO_PEER_MARCUS_ID,
      name: 'Marcus Vance',
      email: 'marcus.demo@enhanceus.org',
      role: 'user',
      isDemo: true,
      emailVerified: true,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
      bio: 'Senior Cloud Architect specializing in Kubernetes, Docker containerization, and AWS infrastructure.',
      availability: 'weekends',
      timezone: 'Europe/London',
      experienceLevel: 'EXPERT',
      preferredLearningStyle: 'project_based',
      sessionsCompleted: 8,
      hoursTaught: 24,
      hoursLearned: 15,
      exchangesCompleted: 5,
      reputation: {
        averageRating: 4.8,
        reviewCount: 6,
      },
      skills: [
        { name: 'Docker', level: 'EXPERT', category: 'Infrastructure', type: 'TEACH' },
        { name: 'Kubernetes', level: 'ADVANCED', category: 'Infrastructure', type: 'TEACH' },
        { name: 'AWS Cloud', level: 'ADVANCED', category: 'Infrastructure', type: 'TEACH' },
      ],
      learningInterests: [
        { name: 'Node.js', category: 'Backend', priority: 'HIGH' },
      ],
    },
  ],

  // 3. Goals & Skill Gaps
  goals: [
    {
      _id: 'demo_goal_saas_001',
      user: DEMO_USER_ID,
      title: 'Build an AI-Powered SaaS Blueprint',
      description: 'Create an end-to-end full-stack SaaS platform incorporating clean UI/UX components, scalable Node.js microservices, and high-converting product design.',
      status: 'ACTIVE',
      requiredSkills: [
        { _id: 'rsk_demo_001', name: 'React', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH', isCompleted: true, completedAt: '2026-10-02T10:00:00.000Z' },
        { _id: 'rsk_demo_002', name: 'TypeScript', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH', isCompleted: true, completedAt: '2026-10-02T10:00:00.000Z' },
        { _id: 'rsk_demo_003', name: 'UI/UX Design', category: 'Design', level: 'INTERMEDIATE', importance: 'HIGH', isCompleted: true, completedAt: '2026-10-15T15:00:00.000Z' },
        { _id: 'rsk_demo_004', name: 'Figma Prototyping', category: 'Design', level: 'INTERMEDIATE', importance: 'HIGH', isCompleted: false, completedAt: null },
        { _id: 'rsk_demo_005', name: 'Docker', category: 'Infrastructure', level: 'INTERMEDIATE', importance: 'MEDIUM', isCompleted: false, completedAt: null },
      ],
      userSkillsSnapshot: [
        { name: 'React', level: 'ADVANCED', category: 'Frontend' },
        { name: 'TypeScript', level: 'ADVANCED', category: 'Frontend' },
      ],
      skillGaps: {
        knownSkills: [{ name: 'React' }, { name: 'TypeScript' }],
        missingSkills: [
          { name: 'UI/UX Design', category: 'Design', recommendedLevel: 'INTERMEDIATE', importance: 'HIGH' },
          { name: 'Figma Prototyping', category: 'Design', recommendedLevel: 'INTERMEDIATE', importance: 'HIGH' },
          { name: 'Docker', category: 'Infrastructure', recommendedLevel: 'INTERMEDIATE', importance: 'MEDIUM' },
        ],
        partiallyKnownSkills: [],
        gapPercentage: 40,
        progress: 60,
      },
      progress: 60,
      createdAt: '2026-10-01T12:00:00.000Z',
      updatedAt: '2026-10-20T14:30:00.000Z',
    },
  ],

  // 4. Roadmaps & Milestones
  roadmaps: [
    {
      _id: 'demo_roadmap_saas_001',
      user: DEMO_USER_ID,
      goal: 'demo_goal_saas_001',
      title: 'Roadmap: AI-Powered SaaS Blueprint',
      goalSummary: 'Structured competency roadmap designed to build the AI-Powered SaaS platform with verified design patterns.',
      estimatedDuration: '8-10 weeks (approx. 5-7 hrs/week)',
      status: 'ACTIVE',
      progress: 55,
      skills: [
        {
          name: 'UI/UX Design',
          description: 'User-centered design principles, typography hierarchy, and accessible color palettes.',
          currentLevel: 'beginner',
          targetLevel: 'intermediate',
        },
        {
          name: 'Figma Prototyping',
          description: 'Component auto-layout, interactive prototypes, and token exports.',
          currentLevel: 'beginner',
          targetLevel: 'intermediate',
        },
        {
          name: 'Docker',
          description: 'Containerized deployment and multi-stage container optimization.',
          currentLevel: 'beginner',
          targetLevel: 'intermediate',
        },
      ],
      milestones: [
        {
          _id: 'ms_001',
          title: 'Design System Foundations & Wireframes',
          description: 'Establish typography scale, color tokens, and low-fidelity user flow wireframes in Figma.',
          status: 'COMPLETED',
          targetSkill: 'UI/UX Design',
          estimatedHours: 12,
          order: 1,
          tasks: [
            { id: 't_001_1', title: 'Define 8pt spatial grid and typographic scale', completed: true },
            { id: 't_001_2', title: 'Create WCAG 2.1 AA accessible color palette', completed: true },
            { id: 't_001_3', title: 'Review with Sarah Chen in peer session', completed: true },
          ],
          prerequisites: [],
          completedAt: '2026-10-18T16:00:00.000Z',
        },
        {
          _id: 'ms_002',
          title: 'Interactive SaaS Prototyping in Figma',
          description: 'Build responsive auto-layout components and interactive click-through prototypes for SaaS dashboard.',
          status: 'IN_PROGRESS',
          targetSkill: 'Figma Prototyping',
          estimatedHours: 16,
          order: 2,
          tasks: [
            { id: 't_002_1', title: 'Build interactive navigation drawer component', completed: true },
            { id: 't_002_2', title: 'Implement variable modes for light and dark themes', completed: false },
            { id: 't_002_3', title: 'Conduct usability walkthrough with exchange partner', completed: false },
          ],
          prerequisites: ['ms_001'],
        },
        {
          _id: 'ms_003',
          title: 'Docker Microservice Deployment',
          description: 'Package backend API services into lean Alpine Linux Docker images with multi-stage builds.',
          status: 'PENDING',
          targetSkill: 'Docker',
          estimatedHours: 14,
          order: 3,
          tasks: [
            { id: 't_003_1', title: 'Author production Dockerfile for Node.js API', completed: false },
            { id: 't_003_2', title: 'Configure docker-compose for local environment', completed: false },
          ],
          prerequisites: ['ms_002'],
        },
      ],
      createdAt: '2026-10-02T10:00:00.000Z',
      updatedAt: '2026-10-21T09:15:00.000Z',
    },
  ],

  // 5. AI Learning Coach Recommendations
  coachRecommendations: [
    {
      _id: 'demo_rec_001',
      user: DEMO_USER_ID,
      title: 'Practice Variable Modes in Figma with Sarah',
      category: 'MILESTONE_NEXT_STEP',
      priority: 'HIGH',
      status: 'ACTIVE',
      targetSkill: 'Figma Prototyping',
      rationale: 'You completed your Design System Foundations milestone. Completing variable modes will unlock your upcoming interactive prototype walkthrough.',
      actionableSteps: [
        'Review Figma Variables documentation on color and number modes',
        'Prepare 3 design tokens to test during your upcoming session with Sarah',
        'Demonstrate component reactivity in both light and dark themes',
      ],
      linkedMilestone: 'ms_002',
      linkedPeer: DEMO_PEER_ID,
      dismissible: true,
      createdAt: '2026-10-22T08:00:00.000Z',
    },
    {
      _id: 'demo_rec_002',
      user: DEMO_USER_ID,
      title: 'Join Learning Circle: Modern Full-Stack Builders',
      category: 'COLLABORATIVE_LEARNING',
      priority: 'MEDIUM',
      status: 'ACTIVE',
      targetSkill: 'React',
      rationale: 'Active circle with 4 peers sharing component architecture patterns and discussing real-world deployment challenges.',
      actionableSteps: [
        'Browse recent discussions in Modern Full-Stack Builders',
        'Share your React custom hooks patterns in the community showcase',
      ],
      dismissible: true,
      createdAt: '2026-10-23T11:00:00.000Z',
    },
  ],

  // 6. Reciprocal Skill Matches
  matches: [
    {
      _id: 'demo_match_001',
      user: DEMO_USER_ID,
      candidate: {
        _id: DEMO_PEER_ID,
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
        bio: 'Principal Product Designer at DesignWave. Specializing in design systems, micro-interactions, and user research.',
        reputation: { averageRating: 4.9, reviewCount: 7 },
        skills: [
          { name: 'UI/UX Design', level: 'EXPERT', category: 'Design', type: 'TEACH' },
          { name: 'Figma Prototyping', level: 'ADVANCED', category: 'Design', type: 'TEACH' },
        ],
        learningInterests: [
          { name: 'React', category: 'Frontend', priority: 'HIGH' },
          { name: 'TypeScript', category: 'Frontend', priority: 'HIGH' },
        ],
        availability: 'flexible',
      },
      goal: 'demo_goal_saas_001',
      matchType: 'PERFECT_RECIPROCAL',
      matchedSkills: [
        { needSkill: 'UI/UX Design', candidateTeachSkill: 'UI/UX Design' },
        { needSkill: 'Figma Prototyping', candidateTeachSkill: 'Figma Prototyping' },
      ],
      reciprocalSkills: [
        { candidateLearnSkill: 'React', userTeachSkill: 'React' },
        { candidateLearnSkill: 'TypeScript', userTeachSkill: 'TypeScript' },
      ],
      availabilityCompatibility: true,
      skillCompatibility: 98,
      overallScore: 97,
      explanation: [
        '✓ Perfect Reciprocal Match: Sarah teaches UI/UX Design & Figma, which you need for your SaaS Blueprint.',
        '✓ High Skill Synergy: You teach React & TypeScript, which Sarah is actively learning.',
        '✓ Verified Track Record: Both members maintain a 4.9+ rating and completed verified exchanges.',
        '✓ Compatible Schedules: Both indicate flexible availability.',
      ],
      status: 'CONNECTED',
      createdAt: '2026-10-05T14:00:00.000Z',
    },
    {
      _id: 'demo_match_002',
      user: DEMO_USER_ID,
      candidate: {
        _id: DEMO_PEER_MARCUS_ID,
        name: 'Marcus Vance',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
        bio: 'Senior Cloud Architect specializing in Kubernetes, Docker containerization, and AWS infrastructure.',
        reputation: { averageRating: 4.8, reviewCount: 6 },
        skills: [
          { name: 'Docker', level: 'EXPERT', category: 'Infrastructure', type: 'TEACH' },
          { name: 'Kubernetes', level: 'ADVANCED', category: 'Infrastructure', type: 'TEACH' },
        ],
        learningInterests: [
          { name: 'Node.js', category: 'Backend', priority: 'HIGH' },
        ],
        availability: 'weekends',
      },
      goal: 'demo_goal_saas_001',
      matchType: 'DIRECT_RECIPROCAL',
      matchedSkills: [
        { needSkill: 'Docker', candidateTeachSkill: 'Docker' },
      ],
      reciprocalSkills: [
        { candidateLearnSkill: 'Node.js', userTeachSkill: 'Node.js' },
      ],
      availabilityCompatibility: true,
      skillCompatibility: 88,
      overallScore: 89,
      explanation: [
        '✓ Strong Reciprocal Opportunity: Marcus teaches Docker, which is required for your third milestone.',
        '✓ Knowledge Match: You teach Node.js, which Marcus seeks for backend orchestration.',
      ],
      status: 'AVAILABLE',
      createdAt: '2026-10-12T16:20:00.000Z',
    },
  ],

  // 7. Learning Circles
  circles: [
    {
      _id: 'demo_circle_001',
      title: 'Modern Full-Stack Builders',
      description: 'Collaborative peer group building scalable web applications with React, TypeScript, Node.js, and modern container architectures.',
      primarySkill: 'React',
      skillLevel: 'INTERMEDIATE',
      membershipPolicy: 'OPEN',
      status: 'ACTIVE',
      creator: DEMO_USER_ID,
      memberCount: 4,
      members: [
        { user: DEMO_USER_ID, role: 'LEADER', joinedAt: '2026-10-01T10:00:00.000Z' },
        { user: DEMO_PEER_ID, role: 'MEMBER', joinedAt: '2026-10-02T11:00:00.000Z' },
        { user: DEMO_PEER_MARCUS_ID, role: 'MEMBER', joinedAt: '2026-10-04T15:00:00.000Z' },
      ],
      meetingSchedule: {
        frequency: 'WEEKLY',
        dayOfWeek: 'Thursday',
        timeUtc: '18:00',
        durationMinutes: 60,
      },
      learningObjectives: [
        'Master resilient React component design and custom hooks',
        'Implement production-ready authentication and tenant isolation',
        'Build collaborative projects with structured code reviews',
      ],
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      _id: 'demo_circle_002',
      title: 'UI/UX & Design Systems Lab',
      description: 'Hands-on practice circle focusing on Figma component architectures, accessibility compliance, and design-to-code pipelines.',
      primarySkill: 'UI/UX Design',
      skillLevel: 'ALL_LEVELS',
      membershipPolicy: 'OPEN',
      status: 'ACTIVE',
      creator: DEMO_PEER_ID,
      memberCount: 5,
      members: [
        { user: DEMO_PEER_ID, role: 'LEADER', joinedAt: '2026-09-20T10:00:00.000Z' },
        { user: DEMO_USER_ID, role: 'MEMBER', joinedAt: '2026-10-03T14:00:00.000Z' },
      ],
      meetingSchedule: {
        frequency: 'BIWEEKLY',
        dayOfWeek: 'Tuesday',
        timeUtc: '17:00',
        durationMinutes: 60,
      },
      learningObjectives: [
        'Explore Figma design tokens and auto-layout patterns',
        'Review real design implementations and provide constructive critique',
      ],
      createdAt: '2026-09-20T10:00:00.000Z',
    },
  ],

  // 8. Circle Posts & Community Discussions
  circlePosts: [
    {
      _id: 'demo_post_001',
      circle: 'demo_circle_001',
      author: {
        _id: DEMO_USER_ID,
        name: 'Alex Morgan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      },
      type: 'ANNOUNCEMENT',
      title: 'Welcome to Modern Full-Stack Builders!',
      content: 'Welcome everyone! We will focus on building robust, accessible React & Node applications. Feel free to post code snippets or questions in the discussions below.',
      likes: [DEMO_PEER_ID, DEMO_PEER_MARCUS_ID],
      likeCount: 2,
      comments: [
        {
          _id: 'demo_comment_001',
          author: {
            _id: DEMO_PEER_ID,
            name: 'Sarah Chen',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
          },
          content: 'Excited to be here! Happy to provide design feedback for any frontend projects.',
          createdAt: '2026-10-02T12:30:00.000Z',
        },
      ],
      createdAt: '2026-10-01T11:00:00.000Z',
    },
  ],

  // 9. Active Peer Connections
  connections: [
    {
      _id: 'demo_conn_001',
      participants: [
        {
          _id: DEMO_USER_ID,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        },
        {
          _id: DEMO_PEER_ID,
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
          reputation: { averageRating: 4.9, reviewCount: 7 },
        },
      ],
      goal: {
        _id: 'demo_goal_saas_001',
        title: 'Full-Stack AI Micro-SaaS MVP',
      },
      skills: {
        userASkill: 'React & TypeScript Architecture',
        userBSkill: 'UI/UX Design & Figma Systems',
      },
      status: 'ACTIVE',
      createdAt: '2026-10-15T10:00:00.000Z',
    },
    {
      _id: 'demo_conn_002',
      participants: [
        {
          _id: DEMO_USER_ID,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        },
        {
          _id: DEMO_PEER_MARCUS_ID,
          name: 'Marcus Vance',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
          reputation: { averageRating: 4.8, reviewCount: 5 },
        },
      ],
      goal: {
        _id: 'demo_goal_saas_001',
        title: 'Full-Stack AI Micro-SaaS MVP',
      },
      skills: {
        userASkill: 'React & TypeScript Architecture',
        userBSkill: 'Docker & Kubernetes Cloud Architecture',
      },
      status: 'ACTIVE',
      createdAt: '2026-10-16T10:00:00.000Z',
    },
  ],

  // 10. Sessions (Completed & Scheduled)
  sessions: [
    {
      _id: 'demo_session_comp_001',
      goal: 'demo_goal_saas_001',
      participants: [
        {
          _id: DEMO_USER_ID,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        },
        {
          _id: DEMO_PEER_ID,
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
        },
      ],
      host: DEMO_USER_ID,
      date: '2026-10-18T15:00:00.000Z',
      time: '15:00',
      durationMinutes: 60,
      skillTaught: 'React Custom Hooks & State Architecture',
      sessionNotes: 'Deep dive into React custom hooks, reducing re-renders, and organizing component state cleanly.',
      status: 'COMPLETED',
      meetingUrl: 'https://meet.jit.si/enhanceus-demo-exchange-1',
      completedBy: [DEMO_USER_ID, DEMO_PEER_ID],
      completedAt: '2026-10-18T16:00:00.000Z',
      createdAt: '2026-10-15T10:00:00.000Z',
    },
    {
      _id: 'demo_session_sched_002',
      goal: 'demo_goal_saas_001',
      participants: [
        {
          _id: DEMO_USER_ID,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        },
        {
          _id: DEMO_PEER_ID,
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
        },
      ],
      host: DEMO_PEER_ID,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      time: '15:00',
      durationMinutes: 60,
      skillTaught: 'Figma Auto-Layout & Design System Tokens',
      sessionNotes: 'Hands-on review of SaaS dashboard wireframe and converting components to auto-layout with variable modes.',
      status: 'SCHEDULED',
      meetingUrl: 'https://meet.jit.si/enhanceus-demo-exchange-2',
      createdAt: '2026-10-20T10:00:00.000Z',
    },
  ],

  // 10. Reviews & Trust Feedback
  reviews: [
    {
      _id: 'demo_rev_001',
      session: 'demo_session_comp_001',
      reviewer: {
        _id: DEMO_PEER_ID,
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
      },
      reviewee: DEMO_USER_ID,
      rating: 5,
      skill: 'React Custom Hooks & State Architecture',
      feedback: 'Alex explained custom hooks with incredible clarity! The code examples were well-structured and directly applicable to our project.',
      punctual: true,
      helpful: true,
      createdAt: '2026-10-18T16:30:00.000Z',
    },
  ],

  // 11. Conversations & Messages
  conversations: [
    {
      _id: 'demo_conv_001',
      participants: [
        {
          _id: DEMO_USER_ID,
          name: 'Alex Morgan',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        },
        {
          _id: DEMO_PEER_ID,
          name: 'Sarah Chen',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
        },
      ],
      lastMessage: {
        text: 'Looking forward to our Figma session tomorrow! The initial wireframes are ready.',
        sender: DEMO_PEER_ID,
        createdAt: '2026-10-23T16:45:00.000Z',
      },
      updatedAt: '2026-10-23T16:45:00.000Z',
    },
  ],

  messages: [
    {
      _id: 'demo_msg_001',
      conversation: 'demo_conv_001',
      sender: DEMO_USER_ID,
      recipient: DEMO_PEER_ID,
      text: "Hi Sarah! Excited to exchange React knowledge for UI/UX Design feedback on my SaaS blueprint.",
      createdAt: '2026-10-15T11:00:00.000Z',
    },
    {
      _id: 'demo_msg_002',
      conversation: 'demo_conv_001',
      sender: DEMO_PEER_ID,
      recipient: DEMO_USER_ID,
      text: "Hi Alex! That sounds like a great exchange. I have been wanting to level up my React state patterns.",
      createdAt: '2026-10-15T11:30:00.000Z',
    },
    {
      _id: 'demo_msg_003',
      conversation: 'demo_conv_001',
      sender: DEMO_PEER_ID,
      recipient: DEMO_USER_ID,
      text: 'Looking forward to our Figma session tomorrow! The initial wireframes are ready.',
      createdAt: '2026-10-23T16:45:00.000Z',
    },
  ],

  // 12. In-App Notifications
  notifications: [
    {
      _id: 'demo_notif_001',
      recipient: DEMO_USER_ID,
      sender: {
        _id: DEMO_PEER_ID,
        name: 'Sarah Chen',
      },
      title: 'Exchange Request Accepted!',
      message: 'Sarah Chen accepted your skill exchange request for UI/UX Design.',
      type: 'EXCHANGE_ACCEPTED',
      link: '/messages',
      read: true,
      createdAt: '2026-10-15T10:15:00.000Z',
    },
    {
      _id: 'demo_notif_002',
      recipient: DEMO_USER_ID,
      sender: {
        _id: DEMO_PEER_ID,
        name: 'Sarah Chen',
      },
      title: 'New 5-Star Peer Review Received',
      message: 'Sarah left you a 5-star rating for "React Custom Hooks & State Architecture".',
      type: 'REVIEW_RECEIVED',
      link: '/profile',
      read: false,
      createdAt: '2026-10-18T16:30:00.000Z',
    },
    {
      _id: 'demo_notif_003',
      recipient: DEMO_USER_ID,
      sender: null,
      title: 'Upcoming Session Reminder',
      message: 'You have a scheduled session with Sarah Chen tomorrow at 15:00 UTC.',
      type: 'SESSION_REMINDER',
      link: '/sessions',
      read: false,
      createdAt: '2026-10-23T12:00:00.000Z',
    },
  ],

  // 13. Proof-of-Skill Portfolio Items
  portfolioItems: [
    {
      _id: 'demo_port_001',
      user: DEMO_USER_ID,
      title: 'React Custom Hooks & State Architecture',
      skillName: 'React',
      category: 'Frontend',
      verificationStatus: 'EXCHANGE_CONFIRMED',
      itemType: 'SESSION_EXCHANGE',
      description: 'Demonstrated deep architectural understanding of custom React hooks, memoization boundaries, and context reduction in a live 60-minute peer exchange.',
      evidenceUrl: 'https://github.com/enhanceus-demo/react-hooks-architecture',
      peerReviewer: {
        _id: DEMO_PEER_ID,
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
        reputation: { averageRating: 4.9 },
      },
      linkedSession: 'demo_session_comp_001',
      linkedGoal: 'demo_goal_saas_001',
      visibility: 'PUBLIC',
      confirmedAt: '2026-10-18T16:30:00.000Z',
      createdAt: '2026-10-18T16:30:00.000Z',
    },
    {
      _id: 'demo_port_002',
      user: DEMO_USER_ID,
      title: 'Enterprise SaaS Design System Token Suite',
      skillName: 'TypeScript',
      category: 'Frontend',
      verificationStatus: 'PORTFOLIO_EVIDENCE',
      itemType: 'CODE_SAMPLE',
      description: 'Open-source design token generator converting Figma style tokens directly into TypeScript types and Tailwind CSS utility classes.',
      evidenceUrl: 'https://github.com/enhanceus-demo/design-tokens-ts',
      visibility: 'PUBLIC',
      createdAt: '2026-10-10T14:20:00.000Z',
    },
  ],

  // 14. Trust & Contribution Summary
  trustSummary: {
    status: 'ESTABLISHED_CONTRIBUTOR',
    overallScore: 98,
    metrics: {
      completedSessionsCount: 4,
      totalHoursTaught: 14,
      totalHoursLearned: 12,
      attendanceRate: 100,
      peerFeedbackAverage: 5.0,
      peerReviewCount: 4,
      confirmedAchievementsCount: 2,
      activeCirclesCount: 2,
    },
    formulaExplanation: 'Trust score evaluates verified session attendance (100%), validated peer feedback ratings (5.0/5.0), and proof-of-skill accomplishments.',
    exclusions: 'Self-ratings, unconfirmed claims, and cancelled sessions are excluded from calculation.',
  },

  // 15. Community Skill-Gap Insights (Simulated Demo Showcase)
  communityInsights: {
    highDemandSkills: [
      { skill: 'Docker', learnerCount: 14, teacherCount: 3, shortage: true, ratio: '4.6:1' },
      { skill: 'UI/UX Design', learnerCount: 18, teacherCount: 6, shortage: true, ratio: '3.0:1' },
      { skill: 'Kubernetes', learnerCount: 11, teacherCount: 2, shortage: true, ratio: '5.5:1' },
      { skill: 'React', learnerCount: 24, teacherCount: 22, shortage: false, ratio: '1.1:1' },
      { skill: 'Node.js', learnerCount: 19, teacherCount: 17, shortage: false, ratio: '1.1:1' },
    ],
    circleOpportunities: [
      {
        skill: 'Docker & Microservices',
        unmetLearners: 12,
        activeCircles: 0,
        recommendation: 'High-impact opportunity to lead a collaborative learning circle in containerization.',
      },
      {
        skill: 'Figma Auto-Layout & Tokens',
        unmetLearners: 8,
        activeCircles: 1,
        recommendation: 'Growing interest in design systems and tokens.',
      },
    ],
    metadata: {
      isSimulatedDemoData: true,
      demoAccountsExcluded: true,
      totalLearnersSampled: 48,
      minGroupThreshold: 3,
    },
  },

  // 16. Simulated Feedback Submissions
  feedbackSubmissions: [],

  // 17. Exchange Requests
  exchangeRequests: [
    {
      _id: 'demo_req_001',
      sender: {
        _id: DEMO_PEER_ID,
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
        skills: [{ name: 'UI/UX Design', level: 'EXPERT', type: 'TEACH' }],
      },
      recipient: DEMO_USER_ID,
      offeredSkill: 'UI/UX Design',
      requestedSkill: 'React',
      message: 'Hi Alex! I noticed your React mentorship skills and would love to exchange Figma design coaching for React state architecture guidance.',
      proposedExchange: 'Hi Alex! I noticed your React mentorship skills and would love to exchange Figma design coaching for React state architecture guidance.',
      status: 'PENDING',
      isDirectRequest: true,
      createdAt: '2026-10-24T14:00:00.000Z',
    },
  ],

  // 18. Moderation & Abuse Reports (Demo Showcase)
  reports: [
    {
      _id: 'demo_report_sample_001',
      reporter: {
        _id: DEMO_USER_ID,
        name: 'Alex Morgan',
        email: 'demo@enhanceus.org',
      },
      reportedUser: {
        _id: DEMO_PEER_MARCUS_ID,
        name: 'Marcus Brody',
        email: 'marcus.demo@enhanceus.org',
        isSuspended: false,
      },
      targetType: 'SKILL_EVIDENCE',
      targetId: `${DEMO_PEER_MARCUS_ID}:Docker Containers`,
      category: 'SUSPICIOUS_EVIDENCE',
      reason: 'The credential link provided appears to lead to an unrelated external repository without verification of ownership.',
      status: 'PENDING',
      moderationNotes: '',
      actionTaken: 'NONE',
      metadata: { skillName: 'Docker Containers' },
      createdAt: '2026-10-20T11:00:00.000Z',
    },
  ],

  // 19. Collaborative Workspaces (V3.7 Demo Showcase)
  collaborativeWorkspaces: [
    {
      _id: 'cws_fullstack_saas_001',
      title: 'Full-Stack SaaS Collaborative Lab',
      description: 'A focused working group designing, building, and deploying real-world SaaS applications with React, Node.js, and Docker.',
      associatedSkill: 'Full-Stack Development',
      associatedGoalTitle: 'AI SaaS Blueprint',
      owner: {
        _id: DEMO_USER_ID,
        name: 'Alex Morgan',
        email: 'demo@enhanceus.org',
        avatar: null,
      },
      visibility: 'PRIVATE',
      members: [
        {
          user: {
            _id: DEMO_USER_ID,
            name: 'Alex Morgan',
            email: 'demo@enhanceus.org',
            avatar: null,
          },
          role: 'OWNER',
          joinedAt: '2026-10-15T10:00:00.000Z',
        },
        {
          user: {
            _id: DEMO_PEER_ID,
            name: 'Sarah Chen',
            email: 'sarah.chen@techsphere.io',
            avatar: null,
          },
          role: 'MEMBER',
          joinedAt: '2026-10-16T14:30:00.000Z',
        },
        {
          user: {
            _id: DEMO_PEER_MARCUS_ID,
            name: 'Marcus Vance',
            email: 'marcus.vance@cloudnative.dev',
            avatar: null,
          },
          role: 'MEMBER',
          joinedAt: '2026-10-17T09:15:00.000Z',
        },
      ],
      invitations: [],
      milestones: [
        {
          _id: 'cws_ms_001',
          title: 'Architecture Blueprint & Database Entity Schemas',
          description: 'Define relational and document schemas with indexing strategies.',
          status: 'COMPLETED',
          assignedTo: {
            _id: DEMO_USER_ID,
            name: 'Alex Morgan',
          },
          completedAt: '2026-10-20T16:00:00.000Z',
          createdAt: '2026-10-15T11:00:00.000Z',
        },
        {
          _id: 'cws_ms_002',
          title: 'Implement Multi-Tenant JWT & Workspace Sandbox',
          description: 'Enforce complete multi-tenant tenant isolation and 24h TTL store.',
          status: 'IN_PROGRESS',
          assignedTo: {
            _id: DEMO_PEER_ID,
            name: 'Sarah Chen',
          },
          dueDate: '2026-11-05T00:00:00.000Z',
          createdAt: '2026-10-18T10:00:00.000Z',
        },
        {
          _id: 'cws_ms_003',
          title: 'Automated CI/CD Pipeline & End-to-End Regression Suite',
          description: 'Write integration suites testing all API requirements.',
          status: 'NOT_STARTED',
          assignedTo: {
            _id: DEMO_PEER_MARCUS_ID,
            name: 'Marcus Vance',
          },
          dueDate: '2026-11-15T00:00:00.000Z',
          createdAt: '2026-10-19T09:00:00.000Z',
        },
      ],
      resources: [
        {
          _id: 'cws_res_001',
          title: 'System Design Interview & Architecture Guide',
          url: 'https://github.com/donnemartin/system-design-primer',
          description: 'Comprehensive primer on large-scale system architecture.',
          addedBy: {
            _id: DEMO_USER_ID,
            name: 'Alex Morgan',
          },
          addedAt: '2026-10-16T12:00:00.000Z',
        },
        {
          _id: 'cws_res_002',
          title: 'Docker Production Best Practices',
          url: 'https://docs.docker.com/develop/develop-images/dockerfile_best-practices/',
          description: 'Multi-stage builds, least-privilege users, and minimal base images.',
          addedBy: {
            _id: DEMO_PEER_MARCUS_ID,
            name: 'Marcus Vance',
          },
          addedAt: '2026-10-17T15:00:00.000Z',
        },
      ],
      notes: {
        content: '### Core Architecture Decisions\n- **Database**: MongoDB with compound indexing for session and workspace lookups.\n- **Authentication**: Stateless signed JWT with workspace sandbox ID.\n- **Styling**: Tailwind CSS with dark mode.\n- **Collaboration Rules**: Milestones require peer sign-off before marking complete.',
        lastUpdatedBy: {
          _id: DEMO_USER_ID,
          name: 'Alex Morgan',
        },
        updatedAt: '2026-10-22T11:00:00.000Z',
      },
      discussions: [
        {
          _id: 'cws_disc_001',
          author: {
            _id: DEMO_PEER_ID,
            name: 'Sarah Chen',
          },
          content: 'Hey team! I have updated the multi-tenant isolation branch. Please test the sandbox reset behavior.',
          createdAt: '2026-10-21T09:30:00.000Z',
        },
        {
          _id: 'cws_disc_002',
          author: {
            _id: DEMO_USER_ID,
            name: 'Alex Morgan',
          },
          content: 'Looks great Sarah! Tested the reset endpoint and verified canonical fixtures are completely immutable.',
          createdAt: '2026-10-21T10:15:00.000Z',
        },
      ],
      isArchived: false,
      createdAt: '2026-10-15T10:00:00.000Z',
      updatedAt: '2026-10-22T11:00:00.000Z',
    },
  ],
};

/**
 * Returns a pristine, independent deep copy of the canonical demo baseline.
 * Guarantees that mutating a visitor workspace will never alter the authoritative fixtures.
 */
export const getCanonicalBaseline = () => {
  return JSON.parse(JSON.stringify(CANONICAL_DEMO_BASELINE));
};
