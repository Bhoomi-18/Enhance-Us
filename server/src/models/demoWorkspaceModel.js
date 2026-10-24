import mongoose from 'mongoose';

const demoWorkspaceSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: '3.3.0',
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tourDismissed: {
      type: Boolean,
      default: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // MongoDB native TTL: automatically evicts stale workspaces after 24 hours
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const DemoWorkspace = mongoose.model('DemoWorkspace', demoWorkspaceSchema);

export default DemoWorkspace;
