import mongoose from 'mongoose';

const portfolioItemSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Portfolio item title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Portfolio item description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    skillName: {
      type: String,
      required: [true, 'Associated skill name is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    itemType: {
      type: String,
      enum: ['PROJECT', 'WORK_SAMPLE', 'LEARNING_MILESTONE', 'EXCHANGE_OUTCOME', 'REFLECTION'],
      default: 'PROJECT',
      index: true,
    },
    evidenceUrl: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Evidence URL must be a valid HTTP or HTTPS web address',
      },
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'MEMBERS_ONLY', 'PRIVATE'],
      default: 'PUBLIC',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['SELF_REPORTED', 'PORTFOLIO_EVIDENCE', 'EXCHANGE_CONFIRMED'],
      default: 'SELF_REPORTED',
      index: true,
    },
    // Exchange-Confirmed Proof Fields
    linkedSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      default: null,
    },
    linkedGoal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
    },
    linkedMilestoneId: {
      type: String,
      default: null,
      trim: true,
    },
    peerReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast profile portfolio queries and public visibility filters
portfolioItemSchema.index({ user: 1, visibility: 1, createdAt: -1 });
portfolioItemSchema.index({ user: 1, verificationStatus: 1 });
portfolioItemSchema.index({ skillName: 1, verificationStatus: 1 });

export const PortfolioItem = mongoose.model('PortfolioItem', portfolioItemSchema);
export default PortfolioItem;
