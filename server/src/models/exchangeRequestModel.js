import mongoose from 'mongoose';

const exchangeRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: false,
    },
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
    },
    offeredSkill: {
      type: String,
      required: true,
      default: 'General Skill Exchange',
    },
    requestedSkill: {
      type: String,
      required: true,
      default: 'Direct Mentorship Session',
    },
    proposedExchange: {
      type: String,
      required: true,
      maxlength: [500, 'Exchange proposal cannot exceed 500 characters'],
      default: 'I would like to exchange knowledge with you on EnhanceUs.',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
      default: 'PENDING',
    },
    isDirectRequest: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce atomic server-side constraint: Exactly ONE pending request per sender-recipient pair
exchangeRequestSchema.index(
  { sender: 1, recipient: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

export const ExchangeRequest = mongoose.model('ExchangeRequest', exchangeRequestSchema);
export default ExchangeRequest;
