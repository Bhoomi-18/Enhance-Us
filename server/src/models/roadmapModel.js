import mongoose from 'mongoose';

const roadmapSkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [100, 'Skill name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Skill description is required'],
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    currentLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'unknown'],
      default: 'unknown',
    },
    targetLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'intermediate',
    },
    gapExplanation: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Gap explanation cannot exceed 500 characters'],
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    learningObjectives: [
      {
        type: String,
        trim: true,
        maxlength: [250, 'Objective cannot exceed 250 characters'],
      },
    ],
    isPossessed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const roadmapStageSchema = new mongoose.Schema(
  {
    stageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    title: {
      type: String,
      required: [true, 'Stage title is required'],
      trim: true,
      maxlength: [150, 'Stage title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Stage description is required'],
      trim: true,
      maxlength: [600, 'Stage description cannot exceed 600 characters'],
    },
    skillNames: [
      {
        type: String,
        trim: true,
      },
    ],
    completionCriteria: [
      {
        type: String,
        trim: true,
        maxlength: [250, 'Completion criterion cannot exceed 250 characters'],
      },
    ],
  },
  { _id: false }
);

const dependencyEdgeSchema = new mongoose.Schema(
  {
    fromSkill: { type: String, required: true, trim: true },
    toSkill: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['REQUIRED', 'RECOMMENDED', 'OPTIONAL_RELATED'],
      default: 'REQUIRED',
    },
    reason: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const learningOrderStepSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    orderIndex: { type: Number, required: true },
    status: {
      type: String,
      enum: ['READY', 'BLOCKED', 'SATISFIED', 'IN_PROGRESS', 'UNKNOWN'],
      default: 'READY',
    },
    requiredPrerequisites: [{ type: String, trim: true }],
    recommendedPrerequisites: [{ type: String, trim: true }],
    satisfiedPrerequisites: [{ type: String, trim: true }],
    unmetPrerequisites: [{ type: String, trim: true }],
    canLearnInParallelWith: [{ type: String, trim: true }],
    explanation: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const prerequisiteAnalysisSchema = new mongoose.Schema(
  {
    totalDependencies: { type: Number, default: 0 },
    requiredDependenciesCount: { type: Number, default: 0 },
    recommendedDependenciesCount: { type: Number, default: 0 },
    readySkillsCount: { type: Number, default: 0 },
    blockedSkillsCount: { type: Number, default: 0 },
    satisfiedSkillsCount: { type: Number, default: 0 },
    parallelOpportunityGroups: { type: [[String]], default: [] },
    generatedBy: { type: String, default: 'gemini' },
    analyzedAt: { type: Date, default: null },
  },
  { _id: false }
);

const milestoneSchema = new mongoose.Schema(
  {
    milestoneId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
    },
    stageNumber: {
      type: Number,
      default: 1,
    },
    orderIndex: {
      type: Number,
      required: true,
      default: 1,
    },
    completionCriteria: [
      {
        type: String,
        trim: true,
        maxlength: [300, 'Completion criterion cannot exceed 300 characters'],
      },
    ],
    requiredPrerequisites: [
      {
        type: String,
        trim: true,
      },
    ],
    recommendedPrerequisites: [
      {
        type: String,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'],
      default: 'NOT_STARTED',
      index: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    learnerNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    blockedReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Blocked reason cannot exceed 500 characters'],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    isAdaptiveAddition: {
      type: Boolean,
      default: false,
    },
    originalMilestoneId: {
      type: String,
      default: null,
    },
  },
  { _id: false, timestamps: true }
);

const roadmapProgressSchema = new mongoose.Schema(
  {
    totalMilestones: { type: Number, default: 0 },
    completedMilestones: { type: Number, default: 0 },
    inProgressMilestones: { type: Number, default: 0 },
    blockedMilestones: { type: Number, default: 0 },
    notStartedMilestones: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 },
    skillProgress: [
      {
        skillName: { type: String, required: true },
        totalMilestones: { type: Number, default: 0 },
        completedMilestones: { type: Number, default: 0 },
        completionPercentage: { type: Number, default: 0 },
      },
    ],
    nextRecommendedMilestoneId: { type: String, default: null },
    nextRecommendedMilestoneTitle: { type: String, default: null },
    nextRecommendedReason: { type: String, default: '' },
    parallelAvailableMilestoneIds: [{ type: String, trim: true }],
    lastActivityAt: { type: Date, default: null },
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Roadmap must belong to a user'],
      index: true,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: [true, 'Roadmap must be associated with a goal'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Roadmap title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    goalSummary: {
      type: String,
      required: [true, 'Goal summary is required'],
      trim: true,
      maxlength: [1000, 'Goal summary cannot exceed 1000 characters'],
    },
    estimatedDuration: {
      type: String,
      required: [true, 'Estimated duration is required'],
      trim: true,
      maxlength: [100, 'Duration cannot exceed 100 characters'],
    },
    assumptions: [
      {
        type: String,
        trim: true,
        maxlength: [300, 'Assumption cannot exceed 300 characters'],
      },
    ],
    skills: {
      type: [roadmapSkillSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Roadmap must include at least one skill',
      },
    },
    stages: {
      type: [roadmapStageSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Roadmap must include at least one stage',
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    roadmapSchemaVersion: {
      type: String,
      default: '2.3',
    },
    dependencyEdges: {
      type: [dependencyEdgeSchema],
      default: [],
    },
    learningOrder: {
      type: [learningOrderStepSchema],
      default: [],
    },
    prerequisiteAnalysis: {
      type: prerequisiteAnalysisSchema,
      default: () => ({}),
    },
    dependencyAnalysisStatus: {
      type: String,
      enum: ['NOT_ANALYZED', 'COMPLETED', 'FAILED'],
      default: 'NOT_ANALYZED',
      index: true,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    progress: {
      type: roadmapProgressSchema,
      default: () => ({}),
    },
    adaptiveAdjustmentHistory: [
      {
        adjustedAt: { type: Date, default: Date.now },
        adjustmentType: { type: String, default: 'BREAKDOWN_MILESTONE' },
        reason: { type: String, default: '' },
        affectedMilestoneIds: [{ type: String }],
        summary: { type: String, default: '' },
      },
    ],
    metadata: {
      generatedBy: { type: String, default: 'gemini' },
      generatedAt: { type: Date, default: Date.now },
      model: { type: String, default: 'gemini-1.5-flash' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast queries by user and creation order
roadmapSchema.index({ user: 1, createdAt: -1 });
roadmapSchema.index({ goal: 1, createdAt: -1 });

export const Roadmap = mongoose.model('Roadmap', roadmapSchema);
export default Roadmap;
