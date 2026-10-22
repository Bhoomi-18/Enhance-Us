import ExchangeRequest from '../models/exchangeRequestModel.js';
import Connection from '../models/connectionModel.js';
import Conversation from '../models/conversationModel.js';
import Match from '../models/matchModel.js';
import Message from '../models/messageModel.js';
import { ApiError } from '../utils/apiError.js';

export const mockExchangeRequestsStore = [];
export const mockConnectionsStore = [];

export const createExchangeRequest = async (senderId, requestData) => {
  const { recipientId, goalId, matchId, offeredSkill, requestedSkill, proposedExchange } = requestData;

  if (senderId.toString() === recipientId.toString()) {
    throw new ApiError(400, 'You cannot send an exchange request to yourself');
  }

  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    const mockReq = {
      _id: 'mock_request_' + Date.now(),
      sender: senderId.toString(),
      recipient: recipientId.toString(),
      goal: goalId,
      match: matchId,
      offeredSkill,
      requestedSkill,
      proposedExchange,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    mockExchangeRequestsStore.push(mockReq);
    return mockReq;
  }

  // Check for duplicate pending request
  const existing = await ExchangeRequest.findOne({
    sender: senderId,
    recipient: recipientId,
    goal: goalId,
    status: 'PENDING',
  });

  if (existing) {
    throw new ApiError(400, 'An exchange request is already pending with this peer for this goal');
  }

  const exchangeRequest = await ExchangeRequest.create({
    sender: senderId,
    recipient: recipientId,
    goal: goalId,
    match: matchId,
    offeredSkill,
    requestedSkill,
    proposedExchange: proposedExchange || `I'd like to exchange ${offeredSkill} for ${requestedSkill}.`,
    status: 'PENDING',
  });

  if (matchId) {
    await Match.findByIdAndUpdate(matchId, { status: 'INTERESTED' });
  }

  return exchangeRequest;
};

export const getUserExchangeRequests = async (userId) => {
  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    return {
      incoming: [],
      outgoing: [
        {
          _id: 'mock_req_outgoing_1',
          sender: userId,
          recipient: { _id: 'candidate_user_b', name: 'Sarah Chen (UI/UX Specialist)', email: 'sarah.chen@example.org' },
          goal: { title: 'Build an AI-powered SaaS Application' },
          offeredSkill: 'React',
          requestedSkill: 'UI/UX Design',
          proposedExchange: "I'd like to exchange React for UI/UX Design.",
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  const incoming = await ExchangeRequest.find({ recipient: userId })
    .populate('sender', '-password')
    .populate('goal', 'title')
    .sort({ createdAt: -1 });

  const outgoing = await ExchangeRequest.find({ sender: userId })
    .populate('recipient', '-password')
    .populate('goal', 'title')
    .sort({ createdAt: -1 });

  return { incoming, outgoing };
};

export const acceptExchangeRequest = async (requestId, userId) => {
  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    const existingReq = mockExchangeRequestsStore.find((r) => r._id === requestId);
    const sender = existingReq ? existingReq.sender : 'mock_sender';
    const goal = existingReq ? existingReq.goal : 'mock_goal_1';
    const connId = 'mock_conn_' + Date.now();
    const mockConn = {
      _id: connId,
      participants: [
        { _id: sender, name: 'Peer' },
        { _id: userId.toString(), name: 'You' },
      ],
      goal: { _id: goal, title: 'Collaborative Goal' },
      skills: {
        userASkill: existingReq ? existingReq.offeredSkill : 'Skill A',
        userBSkill: existingReq ? existingReq.requestedSkill : 'Skill B',
      },
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    };
    mockConnectionsStore.push(mockConn);
    return {
      success: true,
      connection: mockConn,
      conversation: { _id: 'mock_conv_' + Date.now() },
    };
  }

  const request = await ExchangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Exchange request not found');

  if (request.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: You can only accept exchange requests sent directly to you');
  }

  if (request.status === 'ACCEPTED') {
    throw new ApiError(400, 'This exchange request has already been accepted');
  }

  request.status = 'ACCEPTED';
  await request.save();

  // Create Connection record
  const connection = await Connection.create({
    participants: [request.sender, request.recipient],
    goal: request.goal,
    exchangeRequest: request._id,
    skills: {
      userASkill: request.offeredSkill,
      userBSkill: request.requestedSkill,
    },
    status: 'ACTIVE',
  });

  // Create or retrieve Conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [request.sender, request.recipient] },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [request.sender, request.recipient],
      connection: connection._id,
      lastMessage: {
        text: 'Exchange request accepted! Start collaborating on your goal.',
        sender: userId,
        createdAt: new Date(),
      },
    });
  }

  // Create initial system message in conversation
  await Message.create({
    conversation: conversation._id,
    sender: userId,
    recipient: request.sender,
    text: `Exchange accepted! Let's collaborate: Exchanging ${request.offeredSkill} for ${request.requestedSkill}.`,
  });

  if (request.match) {
    await Match.findByIdAndUpdate(request.match, { status: 'CONNECTED' });
  }

  return { connection, conversation };
};

export const declineExchangeRequest = async (requestId, userId) => {
  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    return { success: true };
  }

  const request = await ExchangeRequest.findById(requestId);
  if (!request) throw new ApiError(404, 'Exchange request not found');

  if (request.recipient.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: You can only decline exchange requests sent to you');
  }

  request.status = 'DECLINED';
  await request.save();

  if (request.match) {
    await Match.findByIdAndUpdate(request.match, { status: 'DECLINED' });
  }

  return { success: true };
};

export const getUserConnections = async (userId) => {
  const userIdStr = (userId?._id ? userId._id : userId).toString();

  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    const userConns = mockConnectionsStore.filter((c) =>
      c.participants.some((p) => (p._id ? p._id.toString() : p.toString()) === userIdStr)
    );
    if (userConns.length > 0) return userConns;

    return [
      {
        _id: 'mock_conn_1',
        participants: [
          { _id: userIdStr, name: 'You' },
          { _id: 'mock_user_64656d6f7632', name: 'Sarah Chen (UI/UX Specialist)', email: 'sarah.chen@example.org' },
        ],
        goal: { _id: 'mock_goal_1', title: 'Build Full-Stack SaaS Platform' },
        skills: { userASkill: 'React', userBSkill: 'UI/UX Design' },
        status: 'ACTIVE',
      },
    ];
  }

  return await Connection.find({ participants: userId, status: 'ACTIVE' })
    .populate('participants', 'name email avatar reputation')
    .populate('goal', 'title description')
    .sort({ updatedAt: -1 });
};

