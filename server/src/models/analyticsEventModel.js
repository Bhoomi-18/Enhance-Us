import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: automatically expire raw event records after 90 days (7,776,000 seconds)
// This preserves MongoDB storage on Render/Atlas free tier while keeping analytics fast.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
export default AnalyticsEvent;
