import mongoose from 'mongoose';

const requiredSkillSchema = new mongoose.Schema(
  {
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    level: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      default: 'INTERMEDIATE',
    },
    importance: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH',
    },
  },
  { _id: false }
);

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Goal must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Goal description is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'ACTIVE',
    },
    requiredSkills: [requiredSkillSchema],
    userSkillsSnapshot: [
      {
        name: { type: String, trim: true },
        category: { type: String, default: 'General' },
        level: { type: String, default: 'INTERMEDIATE' },
      },
    ],
    skillGaps: {
      knownSkills: [
        {
          name: { type: String },
          level: { type: String },
          matchedUserSkillLevel: { type: String },
        },
      ],
      missingSkills: [
        {
          name: { type: String },
          category: { type: String },
          recommendedLevel: { type: String },
          importance: { type: String },
        },
      ],
      partiallyKnownSkills: [
        {
          name: { type: String },
          currentLevel: { type: String },
          requiredLevel: { type: String },
        },
      ],
      gapPercentage: { type: Number, default: 0 },
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    aiAnalysis: {
      goalInterpretation: { type: String, default: '' },
      skills: [
        {
          name: { type: String, required: true, trim: true },
          category: { type: String, default: 'General', trim: true },
          level: {
            type: String,
            enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
            default: 'INTERMEDIATE',
          },
          importance: {
            type: String,
            enum: ['HIGH', 'MEDIUM', 'LOW'],
            default: 'HIGH',
          },
          explanation: { type: String, default: '' },
          learningOrder: { type: Number, default: 1 },
          prerequisites: [{ type: String }],
        },
      ],
      milestones: [
        {
          title: { type: String, required: true },
          description: { type: String, default: '' },
          targetTimeline: { type: String, default: '' },
        },
      ],
      estimatedEffort: {
        estimatedHours: { type: String, default: '' },
        timelineRecommendation: { type: String, default: '' },
        uncertaintyDisclaimer: { type: String, default: '' },
      },
      assumptions: [{ type: String }],
      generatedBy: { type: String, default: 'rule-based' },
      generatedAt: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
);

export const Goal = mongoose.model('Goal', goalSchema);
export default Goal;
