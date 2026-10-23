import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Connection',
      required: false,
      index: true,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: false,
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Circle',
      required: false,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    meetingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isGroupSession: {
      type: Boolean,
      default: false,
      index: true,
    },
    maxParticipants: {
      type: Number,
      default: 20,
    },
    rsvps: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        status: {
          type: String,
          enum: ['GOING', 'NOT_GOING', 'WAITLIST'],
          default: 'GOING',
        },
        rsvpAt: {
          type: Date,
          default: Date.now,
        },
        reflection: {
          type: String,
          trim: true,
          default: '',
          maxlength: 500,
        },
      },
    ],
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
    },
    skillTaught: {
      type: String,
      required: true,
    },
    sessionNotes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'MISSED'],
      default: 'SCHEDULED',
    },
    completedBy: [
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

// Compound indexes for user session queries and host history
sessionSchema.index({ participants: 1, status: 1, date: 1 });
sessionSchema.index({ host: 1, date: -1 });

export const Session = mongoose.model('Session', sessionSchema);
export default Session;
