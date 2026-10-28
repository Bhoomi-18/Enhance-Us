import mongoose from 'mongoose';

export const REPORT_CATEGORIES = [
  'MISLEADING_SKILL_CLAIMS',
  'INAPPROPRIATE_BEHAVIOR',
  'HARASSMENT',
  'SPAM',
  'SUSPICIOUS_EVIDENCE',
  'OTHER',
];

export const REPORT_STATUSES = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];

export const MODERATION_ACTIONS = [
  'NONE',
  'WARNING_ISSUED',
  'CONTENT_REMOVED',
  'EVIDENCE_REJECTED',
  'USER_SUSPENDED',
  'DISMISSED',
];

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['USER', 'REVIEW', 'SKILL_EVIDENCE', 'CIRCLE_POST', 'CHALLENGE', 'CHALLENGE_UPDATE', 'OTHER'],
      default: 'USER',
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: REPORT_CATEGORIES,
      required: [true, 'Report category is required'],
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'Please explain the reason for this report'],
      trim: true,
      minlength: [5, 'Explanation must be at least 5 characters long'],
      maxlength: [1000, 'Explanation cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    moderationNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Moderation notes cannot exceed 1000 characters'],
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    actionTaken: {
      type: String,
      enum: MODERATION_ACTIONS,
      default: 'NONE',
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

// Compound indexes for rapid administrative filtering and duplicate detection
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1, status: 1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, status: 1 });

export const Report = mongoose.model('Report', reportSchema);
export default Report;
