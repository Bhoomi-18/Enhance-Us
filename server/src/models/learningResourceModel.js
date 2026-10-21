import mongoose from 'mongoose';

const learningResourceSchema = new mongoose.Schema(
  {
    resourceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    url: {
      type: String,
      required: [true, 'Resource canonical URL is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['documentation', 'tutorial', 'article', 'video', 'interactive', 'exercise', 'reference', 'project'],
      default: 'documentation',
      index: true,
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    milestoneId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    source: {
      type: String,
      trim: true,
      default: 'Official Documentation',
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
      default: 'all-levels',
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationNote: {
      type: String,
      trim: true,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    bookmarkedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    ratings: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        isUseful: {
          type: Boolean,
          required: true,
        },
        ratedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    usefulCount: {
      type: Number,
      default: 0,
    },
    notUsefulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for matching skill and type
learningResourceSchema.index({ skillName: 1, type: 1 });
// Index for fast retrieval of user bookmarks
learningResourceSchema.index({ bookmarkedBy: 1 });

export const LearningResource =
  mongoose.models.LearningResource || mongoose.model('LearningResource', learningResourceSchema);

export default LearningResource;
