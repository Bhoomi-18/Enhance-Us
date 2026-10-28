import mongoose from 'mongoose';

const challengeMilestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [150, 'Milestone title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Milestone description cannot exceed 500 characters'],
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    criteria: {
      type: String,
      trim: true,
      maxlength: [300, 'Milestone criteria cannot exceed 300 characters'],
      default: '',
    },
  },
  { _id: true }
);

const challengeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
      minlength: [3, 'Challenge title must be at least 3 characters'],
      maxlength: [120, 'Challenge title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Challenge description is required'],
      trim: true,
      minlength: [10, 'Challenge description must be at least 10 characters'],
      maxlength: [2000, 'Challenge description cannot exceed 2000 characters'],
    },
    associatedSkill: {
      type: String,
      required: [true, 'Associated skill or learning domain is required'],
      trim: true,
      maxlength: [50, 'Associated skill cannot exceed 50 characters'],
    },
    associatedGoalTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Associated goal title cannot exceed 150 characters'],
      default: '',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    participationType: {
      type: String,
      enum: ['INDIVIDUAL', 'TEAM'],
      default: 'INDIVIDUAL',
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'PRIVATE'],
      default: 'PUBLIC',
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1 participant'],
      max: [1000, 'Capacity cannot exceed 1000 participants'],
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true,
    },
    milestones: [challengeMilestoneSchema],
    rules: {
      type: [String],
      default: [],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for rapid discovery and lifecycle queries
challengeSchema.index({ status: 1, visibility: 1, startDate: 1 });
challengeSchema.index({ associatedSkill: 1, status: 1 });
challengeSchema.index({ creator: 1, status: 1 });

/**
 * Validates start and end date logic.
 */
challengeSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    this.invalidate('endDate', 'End date must be strictly after the start date');
  }
  next();
});

export const Challenge = mongoose.model('Challenge', challengeSchema);
export default Challenge;
