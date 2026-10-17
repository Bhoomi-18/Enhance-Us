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
      required: true,
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
matchSchema.index({ user: 1, candidate: 1, goal: 1 }, { unique: true });

export const Match = mongoose.model('Match', matchSchema);
export default Match;
