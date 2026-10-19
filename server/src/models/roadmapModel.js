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
