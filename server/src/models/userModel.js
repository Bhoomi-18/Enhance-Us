import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const skillEvidenceSchema = new mongoose.Schema(
  {
    portfolioUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Portfolio URL cannot exceed 500 characters'],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Portfolio URL must use http or https protocol',
      },
    },
    certificateUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Certificate URL cannot exceed 500 characters'],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Certificate URL must use http or https protocol',
      },
    },
    workSampleUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Work sample URL cannot exceed 500 characters'],
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Work sample URL must use http or https protocol',
      },
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    verificationStatus: {
      type: String,
      enum: ['NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED'],
      default: 'NOT_SUBMITTED',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewerNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Reviewer notes cannot exceed 1000 characters'],
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Rejection reason cannot exceed 1000 characters'],
    },
  },
  { _id: false }
);

const userSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    level: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'beginner', 'intermediate', 'advanced', 'expert'],
      default: 'INTERMEDIATE',
    },
    type: {
      type: String,
      enum: ['TEACH', 'LEARN', 'both'],
      default: 'TEACH',
    },
    evidence: {
      type: skillEvidenceSchema,
      default: () => ({ verificationStatus: 'NOT_SUBMITTED' }),
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    avatar: {
      type: String,
      default: '',
    },
    languages: {
      type: [String],
      default: ['English'],
    },
    availability: {
      type: String,
      enum: ['flexible', 'weekdays', 'weekends', 'evenings'],
      default: 'flexible',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    experienceLevel: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'beginner', 'intermediate', 'advanced', 'expert'],
      default: 'INTERMEDIATE',
    },
    preferredLearningStyle: {
      type: String,
      enum: ['hands_on', 'visual', 'reading_writing', 'auditory', 'collaborative'],
      default: 'hands_on',
    },
    skills: [userSkillSchema],
    learningInterests: [
      {
        name: { type: String, trim: true },
        category: { type: String, default: 'General' },
        priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', 'high', 'medium', 'low'], default: 'HIGH' },
      },
    ],
    // Statistics & Reputation
    sessionsCompleted: { type: Number, default: 0 },
    hoursTaught: { type: Number, default: 0 },
    hoursLearned: { type: Number, default: 0 },
    exchangesCompleted: { type: Number, default: 0 },
    reputation: {
      averageRating: { type: Number, default: 5.0 },
      reviewCount: { type: Number, default: 0 },
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationTokenHash: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    resetPasswordTokenHash: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    lastVerificationSentAt: {
      type: Date,
      default: null,
    },
    onboardingCompletedAt: {
      type: Date,
      default: null,
    },
    dismissedOnboardingAt: {
      type: Date,
      default: null,
    },
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      sessionUpdates: { type: Boolean, default: true },
      goalReminders: { type: Boolean, default: true },
      peerActivity: { type: Boolean, default: true },
      circleActivity: { type: Boolean, default: true },
      platformAnnouncements: { type: Boolean, default: true },
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Custom JSON transformation to omit sensitive fields when object is converted to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.verificationTokenHash;
  delete userObject.verificationTokenExpires;
  delete userObject.resetPasswordTokenHash;
  delete userObject.resetPasswordExpires;
  delete userObject.__v;
  return userObject;
};

export const User = mongoose.model('User', userSchema);
export default User;
