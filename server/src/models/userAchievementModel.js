import mongoose from 'mongoose';

export const ACHIEVEMENT_DEFINITIONS = {
  FIRST_CHALLENGE_JOINED: {
    key: 'FIRST_CHALLENGE_JOINED',
    title: 'Challenge Initiate',
    description: 'Enrolled in your first community skill challenge.',
    icon: 'Compass',
  },
  FIRST_CHALLENGE_MILESTONE: {
    key: 'FIRST_CHALLENGE_MILESTONE',
    title: 'Milestone Crusher',
    description: 'Successfully reached and marked your first challenge milestone.',
    icon: 'Target',
  },
  FIRST_CHALLENGE_COMPLETED: {
    key: 'FIRST_CHALLENGE_COMPLETED',
    title: 'Challenge Victor',
    description: 'Completed all required deliverables of a community challenge.',
    icon: 'Trophy',
  },
  FIRST_TEAM_CHALLENGE_COMPLETED: {
    key: 'FIRST_TEAM_CHALLENGE_COMPLETED',
    title: 'Synergy Champion',
    description: 'Collaboratively completed a team challenge alongside your workspace peers.',
    icon: 'Users',
  },
  WORKSPACE_CONTRIBUTOR: {
    key: 'WORKSPACE_CONTRIBUTOR',
    title: 'Collaborative Builder',
    description: 'Contributed directly to completing a collaborative workspace deliverable.',
    icon: 'Layers',
  },
  CHALLENGE_MASTER: {
    key: 'CHALLENGE_MASTER',
    title: 'Challenge Master',
    description: 'Successfully conquered three or more distinct community challenges.',
    icon: 'Award',
  },
};

const userAchievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    achievementKey: {
      type: String,
      enum: Object.keys(ACHIEVEMENT_DEFINITIONS),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    icon: {
      type: String,
      default: 'Award',
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Enforces strictly one award per user per achievement key
userAchievementSchema.index({ user: 1, achievementKey: 1 }, { unique: true });

export const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);
export default UserAchievement;
