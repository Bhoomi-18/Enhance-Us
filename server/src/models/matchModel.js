import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: false,
    },
    matchType: {
      type: String,
      enum: ['RECIPROCAL_EXCHANGE', 'PARTIAL_MATCH'],
      default: 'RECIPROCAL_EXCHANGE',
      index: true,
    },
    matchedSkills: [
      {
        needSkill: { type: String, required: true },
        candidateTeachSkill: { type: String, required: true },
      },
    ],
    reciprocalSkills: [
      {
        candidateLearnSkill: { type: String, required: true },
        userTeachSkill: { type: String, required: true },
      },
    ],
    availabilityCompatibility: {
      type: Boolean,
      default: false,
    },
    skillCompatibility: {
      type: Number,
      default: 0,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    scoreBreakdown: {
      reciprocityScore: { type: Number, default: 0 },
      needScore: { type: Number, default: 0 },
      availabilityScore: { type: Number, default: 0 },
      proficiencyScore: { type: Number, default: 0 },
      reliabilityScore: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ['SUGGESTED', 'INTERESTED', 'DECLINED', 'EXPIRED', 'CONNECTED'],
      default: 'SUGGESTED',
    },
    explanation: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate match records for same user + candidate + goal
matchSchema.index({ user: 1, candidate: 1, goal: 1 }, { unique: true, sparse: true });

export const Match = mongoose.model('Match', matchSchema);
export default Match;
