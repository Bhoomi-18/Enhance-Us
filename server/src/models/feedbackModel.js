import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    improvements: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Improvements field cannot exceed 2000 characters'],
    },
    newFeatures: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'New features field cannot exceed 2000 characters'],
    },
    comments: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Comments field cannot exceed 2000 characters'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submittedEmail: {
      type: String,
      default: null,
      trim: true,
    },
    emailDelivered: {
      type: Boolean,
      default: false,
    },
    emailDeliveryError: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['NEW', 'REVIEWED', 'IN_PROGRESS', 'RESOLVED'],
      default: 'NEW',
      index: true,
    },
    source: {
      type: String,
      enum: ['WEBSITE', 'GOOGLE_FORMS_CSV', 'IMPORT'],
      default: 'WEBSITE',
    },
    adminNotes: [
      {
        note: { type: String, required: true },
        adminEmail: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
