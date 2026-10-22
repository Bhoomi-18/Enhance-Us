import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    actorName: {
      type: String,
      default: 'Administrator',
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    targetType: {
      type: String,
      default: 'GENERAL',
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
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

// TTL index: 180-day retention for audit events (15,552,000 seconds)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
