import mongoose from 'mongoose';

const workspaceMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MEMBER'],
      default: 'MEMBER',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const workspaceInvitationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const workspaceMilestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [150, 'Milestone title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Milestone description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const workspaceResourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    url: {
      type: String,
      required: [true, 'Resource URL is required'],
      trim: true,
      maxlength: [500, 'URL cannot exceed 500 characters'],
      match: [/^https?:\/\/.+/i, 'Resource URL must begin with http:// or https://'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const workspaceDiscussionSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Discussion message cannot be empty'],
      trim: true,
      maxlength: [1000, 'Discussion message cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const workspaceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Workspace title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Workspace description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    associatedSkill: {
      type: String,
      required: [true, 'Associated skill or learning domain is required'],
      trim: true,
      maxlength: [100, 'Associated skill cannot exceed 100 characters'],
      index: true,
    },
    associatedGoalTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Goal title cannot exceed 150 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ['PRIVATE', 'PUBLIC'],
      default: 'PRIVATE',
      index: true,
    },
    members: [workspaceMemberSchema],
    invitations: [workspaceInvitationSchema],
    milestones: [workspaceMilestoneSchema],
    resources: [workspaceResourceSchema],
    notes: {
      content: {
        type: String,
        default: '',
        maxlength: [5000, 'Workspace notes cannot exceed 5000 characters'],
      },
      lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
    discussions: [workspaceDiscussionSchema],
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for calculating completion progress dynamically
workspaceSchema.virtual('progress').get(function () {
  if (!this.milestones || this.milestones.length === 0) return 0;
  const completed = this.milestones.filter((m) => m.status === 'COMPLETED').length;
  return Math.round((completed / this.milestones.length) * 100);
});

// Indexes for high performance lookups
workspaceSchema.index({ 'members.user': 1, isArchived: 1 });
workspaceSchema.index({ visibility: 1, isArchived: 1, createdAt: -1 });
workspaceSchema.index({ 'invitations.user': 1, 'invitations.status': 1 });

export const Workspace = mongoose.model('Workspace', workspaceSchema);
export default Workspace;
