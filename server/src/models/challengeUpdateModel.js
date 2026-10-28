import mongoose from 'mongoose';

const challengeUpdateSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: [true, 'Update content is required'],
      trim: true,
      minlength: [1, 'Update content cannot be empty'],
      maxlength: [1000, 'Update content cannot exceed 1000 characters'],
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    evidenceUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Evidence URL cannot exceed 500 characters'],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Evidence URL must use http or https protocol',
      },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

challengeUpdateSchema.index({ challenge: 1, createdAt: -1 });

export const ChallengeUpdate = mongoose.model('ChallengeUpdate', challengeUpdateSchema);
export default ChallengeUpdate;
