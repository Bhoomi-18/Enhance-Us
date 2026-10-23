import mongoose from 'mongoose';

const circleMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'MODERATOR', 'MEMBER'],
      default: 'MEMBER',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [300, 'Message cannot exceed 300 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
  },
  { _id: true }
);

const circleTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Task title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    completedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isCompleted: {
      type: Boolean,
      default: false,
    },
    linkUrl: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true, timestamps: true }
);

const circleMilestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Milestone title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    targetDate: {
      type: Date,
    },
    completionCriteria: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED',
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tasks: [circleTaskSchema],
    resources: [
      {
        title: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: true, timestamps: true }
);

const circleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Circle title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Circle description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    primarySkill: {
      type: String,
      required: [true, 'Primary skill or domain is required'],
      trim: true,
      index: true,
    },
    secondarySkills: [
      {
        type: String,
        trim: true,
      },
    ],
    learningObjectives: [
      {
        type: String,
        trim: true,
      },
    ],
    skillLevel: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS'],
      default: 'ALL_LEVELS',
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    members: [circleMemberSchema],
    memberLimit: {
      type: Number,
      default: 20,
      min: [2, 'Member limit must be at least 2'],
      max: [50, 'Member limit cannot exceed 50 for collaborative focus'],
    },
    membershipPolicy: {
      type: String,
      enum: ['OPEN', 'APPLY_TO_JOIN', 'INVITE_ONLY'],
      default: 'OPEN',
      index: true,
    },
    joinRequests: [joinRequestSchema],
    roadmap: [circleMilestoneSchema],
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'CLOSED'],
      default: 'ACTIVE',
      index: true,
    },
    activityLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        details: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for discovery and member lookups
circleSchema.index({ primarySkill: 1, status: 1 });
circleSchema.index({ 'members.user': 1, status: 1 });
circleSchema.index({ status: 1, membershipPolicy: 1, createdAt: -1 });

export const Circle = mongoose.model('Circle', circleSchema);
export default Circle;
