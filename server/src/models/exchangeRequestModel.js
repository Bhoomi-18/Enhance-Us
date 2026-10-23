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
    },
    requestedSkill: {
      type: String,
      required: true,
    },
    proposedExchange: {
      type: String,
      required: true,
      default: 'I would like to exchange knowledge with you on EnhanceUs.',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

export const ExchangeRequest = mongoose.model('ExchangeRequest', exchangeRequestSchema);
export default ExchangeRequest;
