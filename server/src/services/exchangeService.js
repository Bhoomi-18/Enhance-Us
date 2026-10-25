import ExchangeRequest from '../models/exchangeRequestModel.js';
import Connection from '../models/connectionModel.js';
import Conversation from '../models/conversationModel.js';
import Match from '../models/matchModel.js';
import Message from '../models/messageModel.js';
import User from '../models/userModel.js';
import { ApiError } from '../utils/apiError.js';
import { createFilteredNotification } from './notificationService.js';

export const mockExchangeRequestsStore = [];
export const mockConnectionsStore = [];

export const getPendingRequestStatus = async (requesterId, recipientId) => {
  if (!recipientId) return { hasPendingRequest: false, pendingRequest: null };

  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    const existingReq = mockExchangeRequestsStore.find(
      (r) =>
        r.sender === requesterId.toString() &&
        r.recipient === recipientId.toString() &&
        r.status === 'PENDING'
    );
    return { hasPendingRequest: Boolean(existingReq), pendingRequest: existingReq || null };
  }

  const pending = await ExchangeRequest.findOne({
    sender: requesterId,
    recipient: recipientId,
    status: 'PENDING',
  });

  return {
    hasPendingRequest: Boolean(pending),
    pendingRequest: pending || null,
  };
};

export const createExchangeRequest = async (senderId, requestData) => {
  const { recipientId, goalId, matchId, offeredSkill, requestedSkill } = requestData;
  const rawMessage = requestData.message !== undefined ? requestData.message : requestData.proposedExchange;
  const message = (rawMessage || '').trim();

  if (!recipientId) {
    throw new ApiError(400, 'Recipient ID is required');
  }

  if (senderId.toString() === recipientId.toString()) {
    throw new ApiError(400, 'You cannot send an exchange request to yourself');
  }

  if (message.length > 500) {
    throw new ApiError(400, 'Custom message cannot exceed 500 characters');
  }

  if (process.env.MOCK_DB === 'true' && Connection.db?.readyState !== 1) {
    const existingReq = mockExchangeRequestsStore.find(
      (r) =>
        r.sender === senderId.toString() &&
        r.recipient === recipientId.toString() &&
        r.status === 'PENDING'
    );
    if (existingReq) {
      throw new ApiError(409, 'A pending session request already exists with this peer');
    }

    const mockReq = {
      _id: 'mock_request_' + Date.now(),
      sender: senderId.toString(),
      recipient: recipientId.toString(),
      goal: goalId,
      match: matchId,
      offeredSkill: offeredSkill || 'General Skill Exchange',
      requestedSkill: requestedSkill || 'Direct Mentorship Session',
      proposedExchange: message || `I'd like to exchange knowledge with you on EnhanceUs.`,
      status: 'PENDING',
      isDirectRequest: Boolean(requestData.isDirectRequest || (!goalId && !matchId)),
      createdAt: new Date().toISOString(),
    };
    mockExchangeRequestsStore.push(mockReq);
    return mockReq;
  }

  // Ensure recipient exists and is not suspended
  const recipient = await User.findById(recipientId);
  if (!recipient || recipient.isSuspended) {
    throw new ApiError(404, 'Recipient user not found or unavailable');
  }

  // Enforce rule: A requester may have only one pending direct request to a particular recipient at a time
  const existingPending = await ExchangeRequest.findOne({
    sender: senderId,
    recipient: recipientId,
    status: 'PENDING',
  });

  if (existingPending) {
    throw new ApiError(409, 'A pending session request already exists with this peer');
  }

  let exchangeRequest;
  try {
    exchangeRequest = await ExchangeRequest.create({
      sender: senderId,
      recipient: recipientId,
      goal: goalId || null,
      match: matchId || null,
      offeredSkill: offeredSkill?.trim() || 'General Skill Exchange',
      requestedSkill: requestedSkill?.trim() || 'Direct Mentorship Session',
      proposedExchange: message || `I would like to exchange knowledge with you on EnhanceUs.`,
      status: 'PENDING',
      isDirectRequest: Boolean(requestData.isDirectRequest || (!goalId && !matchId)),
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new ApiError(409, 'A pending session request already exists with this peer');
    }
    throw err;
  }

  if (matchId) {
    await Match.findByIdAndUpdate(matchId, { status: 'INTERESTED' });
  }

  // Dispatch in-app notification & optional email to recipient
  try {
    const sender = await User.findById(senderId).select('name');
    await createFilteredNotification({
      recipientId,
      senderId,
      type: 'REQUEST',
      title: 'New Exchange Session Request',
      message: `${sender?.name || 'A peer'} sent you an exchange session request: "${(
        message || 'I would like to exchange knowledge with you.'
      ).slice(0, 90)}"`,
      link: '/messages',
    });
  } catch (notifErr) {
    console.warn('⚠️ [Request Notification Non-fatal]', notifErr.message);
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
    goal: request.goal || null,
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

  // Notify requester that their proposal was accepted
  try {
    const accepter = await User.findById(userId).select('name');
    await createFilteredNotification({
      recipientId: request.sender,
      senderId: userId,
      type: 'REQUEST_ACCEPTED',
      title: 'Exchange Request Accepted',
      message: `${accepter?.name || 'A peer'} accepted your exchange proposal! You can now start collaborating in chat.`,
      link: '/messages',
    });
  } catch (notifErr) {
    console.warn('⚠️ [Accept Request Notification Non-fatal]', notifErr.message);
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

  // Notify requester that proposal was declined
  try {
    const decliner = await User.findById(userId).select('name');
    await createFilteredNotification({
      recipientId: request.sender,
      senderId: userId,
      type: 'REQUEST_DECLINED',
      title: 'Exchange Request Update',
      message: `${decliner?.name || 'Peer'} was unable to accept your exchange proposal at this time.`,
      link: '/messages',
    });
  } catch (notifErr) {
    console.warn('⚠️ [Decline Request Notification Non-fatal]', notifErr.message);
  }

  return { success: true, request, status: 'DECLINED' };
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

