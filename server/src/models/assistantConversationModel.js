import mongoose from 'mongoose';

const assistantMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    actionType: {
      type: String,
      enum: [
        'EXPLAIN_CONCEPT',
        'HELP_BLOCKER',
        'GUIDE_MILESTONE',
        'PRACTICE_EXERCISE',
        'KNOWLEDGE_CHECK',
        'EVALUATE_ANSWER',
        'SUMMARIZE_PROGRESS',
        'PEER_PREP',
        'GENERAL_QUERY',
      ],
      default: 'GENERAL_QUERY',
    },
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const assistantConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roadmap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap',
      required: true,
      index: true,
    },
    milestoneId: {
      type: String,
      trim: true,
      default: null,
    },
    skillName: {
      type: String,
      trim: true,
      default: null,
    },
    messages: [assistantMessageSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a user's conversation for a specific roadmap
assistantConversationSchema.index({ user: 1, roadmap: 1 });

export const AssistantConversation =
  mongoose.models.AssistantConversation ||
  mongoose.model('AssistantConversation', assistantConversationSchema);

export default AssistantConversation;
