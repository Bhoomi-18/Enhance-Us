import mongoose from 'mongoose';

const coachRecommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'MILESTONE_NEXT_STEP',
        'PREREQUISITE_PRACTICE',
        'PRACTICAL_EXERCISE',
        'PROJECT_IDEA',
        'EXCHANGE_PARTNER',
        'LEARNING_CIRCLE',
        'GOAL_REFINEMENT',
      ],
      required: [true, 'Recommendation type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Recommendation title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Recommendation content is required'],
      trim: true,
      maxlength: [3000, 'Content cannot exceed 3000 characters'],
    },
    rationale: {
      type: String,
      required: [true, 'Recommendation rationale is required'],
      trim: true,
      maxlength: [1000, 'Rationale cannot exceed 1000 characters'],
    },
    associatedSkill: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    associatedGoal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
    },
    associatedMilestoneId: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DISMISSED', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    userFeedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Feedback cannot exceed 500 characters'],
    },
    dismissalReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Dismissal reason cannot exceed 200 characters'],
    },
    isAiGenerated: {
      type: Boolean,
      default: false,
    },
    actionMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find active recommendations per user
coachRecommendationSchema.index({ user: 1, status: 1, createdAt: -1 });

const CoachRecommendation =
  mongoose.models.CoachRecommendation ||
  mongoose.model('CoachRecommendation', coachRecommendationSchema);

export default CoachRecommendation;
