import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import Connection from '../models/connectionModel.js';
import { ApiError } from '../utils/apiError.js';

export const getUserConversations = async (userId) => {
  if (process.env.MOCK_DB === 'true') {
    return [
      {
        _id: 'mock_conv_1',
        participants: [
          { _id: userId, name: 'You' },
          { _id: 'candidate_user_b', name: 'Sarah Chen (UI/UX Specialist)', email: 'sarah.chen@example.org' },
        ],
        lastMessage: {
          text: 'Hi! Exciting to exchange React knowledge for UI/UX Design tips.',
          sender: 'candidate_user_b',
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  return await Conversation.find({ participants: userId })
    .populate('participants', '-password')
    .populate('connection')
    .sort({ updatedAt: -1 });
};

export const getConversationById = async (conversationId, userId) => {
  if (process.env.MOCK_DB === 'true') {
    return {
      conversation: {
        _id: 'mock_conv_1',
        participants: [
          { _id: userId, name: 'You' },
          { _id: 'candidate_user_b', name: 'Sarah Chen (UI/UX Specialist)', email: 'sarah.chen@example.org' },
        ],
      },
      messages: [
        {
          _id: 'msg_1',
          sender: { _id: 'candidate_user_b', name: 'Sarah Chen' },
          text: 'Exchange accepted! I can help you with Figma UI components whenever you are ready.',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          _id: 'msg_2',
          sender: { _id: userId, name: 'You' },
          text: 'Awesome! I can show you how to structure React custom hooks in return.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  const conversation = await Conversation.findById(conversationId).populate('participants', '-password');
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const isParticipant = conversation.participants.some((p) => p._id.toString() === userId.toString());
  if (!isParticipant) throw new ApiError(403, 'Forbidden: You are not a participant in this conversation');

  const messages = await Message.find({ conversation: conversationId })
    .populate('sender', 'name email avatar')
    .sort({ createdAt: 1 });

  return { conversation, messages };
};

export const sendMessage = async (conversationId, senderId, text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new ApiError(400, 'Message text is required');
  }

  if (process.env.MOCK_DB === 'true') {
    return {
      _id: 'mock_msg_' + Date.now(),
      conversation: conversationId,
      sender: senderId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'Conversation not found');

  const recipientId = conversation.participants.find((p) => p.toString() !== senderId.toString());

  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    recipient: recipientId,
    text: text.trim(),
  });

  // Update lastMessage on conversation
  conversation.lastMessage = {
    text: text.trim(),
    sender: senderId,
    createdAt: new Date(),
  };
  await conversation.save();

  return message;
};
