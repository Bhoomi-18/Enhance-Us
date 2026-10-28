import mongoose from 'mongoose';

const completedMilestoneSchema = new mongoose.Schema(
  {
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Milestone completion note cannot exceed 300 characters'],
      default: '',
    },
  },
  { _id: false }
);

const challengeParticipationSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teamWorkspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
      index: true,
    },
    participationType: {
      type: String,
      enum: ['INDIVIDUAL', 'TEAM'],
      default: 'INDIVIDUAL',
    },
    status: {
      type: String,
      enum: ['REGISTERED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
      default: 'REGISTERED',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    completedMilestones: [completedMilestoneSchema],
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index preventing duplicate registrations per user per challenge
challengeParticipationSchema.index({ challenge: 1, user: 1 }, { unique: true });
challengeParticipationSchema.index({ challenge: 1, teamWorkspace: 1 });
challengeParticipationSchema.index({ user: 1, status: 1 });

export const ChallengeParticipation = mongoose.model('ChallengeParticipation', challengeParticipationSchema);
export default ChallengeParticipation;
