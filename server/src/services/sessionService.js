import mongoose from 'mongoose';
import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';
import Connection from '../models/connectionModel.js';
import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';

export const mockSessionsStore = [];

export const createSession = async (userId, sessionData) => {
  const {
    connectionId,
    goalId,
    recipientId,
    date,
    time,
    durationMinutes = 60,
    skillTaught,
    sessionNotes = '',
  } = sessionData || {};

  // 1. Validate required fields
  if (!date) {
    throw new ApiError(400, 'Session date is required');
  }
  if (!time) {
    throw new ApiError(400, 'Session time is required');
  }
  if (!skillTaught || !skillTaught.trim()) {
    throw new ApiError(400, 'Skill being taught is required');
  }

  const durationNum = Number(durationMinutes);
  if (isNaN(durationNum) || durationNum < 15 || durationNum > 240) {
    throw new ApiError(400, 'Duration must be between 15 and 240 minutes');
  }

  // 2. Normalize and validate date & time (supports HH:mm, HH:mm:ss, ISO strings)
  let normalizedTime = String(time || '').trim();
  const timeParts = normalizedTime.split(':');
  if (timeParts.length >= 2) {
    const hours = timeParts[0].padStart(2, '0');
    const minutes = timeParts[1].padStart(2, '0');
    const seconds = timeParts.length >= 3 ? timeParts[2].slice(0, 2).padStart(2, '0') : '00';
    normalizedTime = `${hours}:${minutes}:${seconds}`;
  } else {
    throw new ApiError(400, 'Invalid time format. Expected HH:mm');
  }

  const dateStr = typeof date === 'string' && date.includes('T') ? date.split('T')[0] : String(date).trim();

  let scheduledDateTime;
  // If client provided explicit clientTimezoneOffset in minutes (JS getTimezoneOffset() convention)
  if (sessionData?.clientTimezoneOffset !== undefined && !isNaN(Number(sessionData.clientTimezoneOffset))) {
    const offsetMs = Number(sessionData.clientTimezoneOffset) * 60 * 1000;
    const naiveUtc = new Date(`${dateStr}T${normalizedTime}Z`).getTime();
    if (!isNaN(naiveUtc)) {
      scheduledDateTime = new Date(naiveUtc + offsetMs);
    }
  }

  if (!scheduledDateTime || isNaN(scheduledDateTime.getTime())) {
    scheduledDateTime = new Date(`${dateStr}T${normalizedTime}`);
  }

  if (isNaN(scheduledDateTime.getTime())) {
    throw new ApiError(400, 'Invalid date or time format. Please provide a valid date and time');
  }

  // Allow a 12-hour tolerance for the current calendar day across global timezones (Render runs UTC),
  // while strictly rejecting genuinely past dates (e.g. past days)
  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayOrFuture = dateStr >= todayStr;
  const minAllowedTime = isTodayOrFuture
    ? Date.now() - 12 * 60 * 60 * 1000 // 12-hour buffer allows users worldwide to schedule on current date
    : Date.now() - 15 * 60 * 1000;

  if (scheduledDateTime.getTime() < minAllowedTime) {
    throw new ApiError(400, 'Session date and time must be set in the future');
  }

  const hostIdStr = (userId?._id ? userId._id : userId).toString();
  const displayTime = normalizedTime.slice(0, 5);

  let resolvedConnectionId = connectionId && typeof connectionId === 'object' ? (connectionId._id || connectionId.id) : connectionId;
  resolvedConnectionId = resolvedConnectionId ? resolvedConnectionId.toString().trim() : null;
  if (!resolvedConnectionId || resolvedConnectionId === 'undefined' || resolvedConnectionId === 'null') {
    resolvedConnectionId = null;
  }

  let resolvedGoalId = goalId && typeof goalId === 'object' ? (goalId._id || goalId.id) : goalId;
  resolvedGoalId = resolvedGoalId ? resolvedGoalId.toString().trim() : null;
  if (!resolvedGoalId || resolvedGoalId === 'undefined' || resolvedGoalId === 'null') {
    resolvedGoalId = null;
  }

  let resolvedRecipientId = recipientId && typeof recipientId === 'object' ? (recipientId._id || recipientId.id) : recipientId;
  resolvedRecipientId = resolvedRecipientId ? resolvedRecipientId.toString().trim() : null;
  if (!resolvedRecipientId || resolvedRecipientId === 'undefined' || resolvedRecipientId === 'null') {
    resolvedRecipientId = null;
  }

  // Validate ObjectId structure in real MongoDB mode to prevent unhandled CastErrors
  if (Session.db?.readyState === 1 || process.env.MOCK_DB !== 'true') {
    if (resolvedConnectionId && !mongoose.Types.ObjectId.isValid(resolvedConnectionId)) {
      throw new ApiError(400, 'Specified connection ID is invalid');
    }
    if (resolvedRecipientId && !mongoose.Types.ObjectId.isValid(resolvedRecipientId)) {
      throw new ApiError(400, 'Specified recipient peer ID is invalid');
    }
    if (resolvedGoalId && !mongoose.Types.ObjectId.isValid(resolvedGoalId)) {
      resolvedGoalId = null;
    }
  }

  // 3. Resolve connection and verify authorization
  if (resolvedConnectionId) {
    if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
      const { mockConnectionsStore } = await import('./exchangeService.js');
      const connection = mockConnectionsStore.find((c) => c._id === resolvedConnectionId);
      if (connection) {
        const isParticipant = connection.participants.some(
          (p) => (p._id ? p._id.toString() : p.toString()) === hostIdStr
        );
        if (!isParticipant) {
          throw new ApiError(403, 'Forbidden: You are not an authorized participant in this connection');
        }

        if (!resolvedGoalId && connection.goal) {
          resolvedGoalId = connection.goal._id || connection.goal;
        }

        if (!resolvedRecipientId) {
          const other = connection.participants.find(
            (p) => (p._id ? p._id.toString() : p.toString()) !== hostIdStr
          );
          if (other) {
            resolvedRecipientId = (other._id ? other._id : other).toString();
          }
        }
      }
    } else {
      const connection = await Connection.findById(resolvedConnectionId);
      if (!connection) {
        throw new ApiError(404, 'Specified connection was not found');
      }

      const isParticipant = connection.participants.some(
        (p) => (p._id ? p._id.toString() : p.toString()) === hostIdStr
      );
      if (!isParticipant) {
        throw new ApiError(403, 'Forbidden: You are not an authorized participant in this connection');
      }

      if (!resolvedGoalId && connection.goal) {
        resolvedGoalId = connection.goal;
      }

      if (!resolvedRecipientId) {
        const other = connection.participants.find(
          (p) => (p._id ? p._id.toString() : p.toString()) !== hostIdStr
        );
        if (other) {
          resolvedRecipientId = (other._id ? other._id : other).toString();
        }
      }
    }
  }

  // 4. If no connection was explicitly provided, auto-link existing connection if one exists
  if (!resolvedConnectionId && resolvedRecipientId && (Session.db?.readyState === 1 || process.env.MOCK_DB !== 'true')) {
    const existingConn = await Connection.findOne({
      participants: { $all: [userId, resolvedRecipientId] },
      status: 'ACTIVE',
    });
    if (existingConn) {
      resolvedConnectionId = existingConn._id;
      if (!resolvedGoalId && existingConn.goal) {
        resolvedGoalId = existingConn.goal;
      }
    }
  }

  // 5. Validate peer recipient
  if (!resolvedRecipientId) {
    throw new ApiError(400, 'A valid peer recipient is required to schedule an exchange session');
  }

  if (hostIdStr === resolvedRecipientId) {
    throw new ApiError(400, 'Cannot schedule an exchange session with yourself');
  }

  // 6. Check recipient user existence (when using real MongoDB)
  if (Session.db?.readyState === 1 || process.env.MOCK_DB !== 'true') {
    const recipientUser = await User.findById(resolvedRecipientId);
    if (!recipientUser) {
      throw new ApiError(404, 'Recipient peer user not found');
    }
  }

  // 7. Check for duplicate scheduled session at the same date and time
  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    const duplicate = mockSessionsStore.find(
      (s) =>
        s.status === 'SCHEDULED' &&
        (s.time === displayTime || s.time === time) &&
        s.date.startsWith(dateStr) &&
        s.participants.includes(hostIdStr) &&
        s.participants.includes(resolvedRecipientId)
    );
    if (duplicate) {
      throw new ApiError(400, 'A session is already scheduled with this peer at the selected date and time');
    }

    const newMockSession = {
      _id: 'mock_session_' + Date.now(),
      connection: resolvedConnectionId || 'mock_conn_1',
      goal: resolvedGoalId || 'mock_goal_1',
      participants: [hostIdStr, resolvedRecipientId],
      host: hostIdStr,
      date: scheduledDateTime.toISOString(),
      time: displayTime,
      durationMinutes: durationNum,
      skillTaught: skillTaught.trim(),
      sessionNotes: sessionNotes ? sessionNotes.trim() : '',
      status: 'SCHEDULED',
      completedBy: [],
      createdAt: new Date().toISOString(),
    };
    mockSessionsStore.push(newMockSession);
    return newMockSession;
  }

  // Real MongoDB Duplicate Check
  const duplicate = await Session.findOne({
    participants: { $all: [userId, resolvedRecipientId] },
    date: scheduledDateTime,
    status: 'SCHEDULED',
  });
  if (duplicate) {
    throw new ApiError(400, 'A session is already scheduled with this peer at the selected date and time');
  }

  // 8. Create Session
  const session = await Session.create({
    connection: resolvedConnectionId || null,
    goal: resolvedGoalId || null,
    participants: [userId, resolvedRecipientId],
    host: userId,
    date: scheduledDateTime,
    time: displayTime,
    durationMinutes: durationNum,
    skillTaught: skillTaught.trim(),
    sessionNotes: sessionNotes ? sessionNotes.trim() : '',
    status: 'SCHEDULED',
  });

  // 9. Create notification for recipient
  try {
    await Notification.create({
      recipient: resolvedRecipientId,
      sender: userId,
      type: 'SESSION_SCHEDULED',
      title: 'New Exchange Session Scheduled',
      message: `A new session for ${skillTaught.trim()} has been scheduled for ${scheduledDateTime.toLocaleDateString()} at ${displayTime}.`,
      link: `/sessions`,
    });
  } catch (notifErr) {
    console.warn('[Notification Error]', notifErr.message);
  }

  const populated = await Session.findById(session._id)
    .populate('participants', 'name email avatar reputation')
    .populate('goal', 'title');

  return populated || session;
};

export const getUserSessions = async (userId, statusFilter) => {
  const userIdStr = (userId?._id ? userId._id : userId).toString();

  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    let userMockSessions = mockSessionsStore.filter((s) =>
      s.participants.includes(userIdStr)
    );
    if (statusFilter) {
      userMockSessions = userMockSessions.filter((s) => s.status === statusFilter);
    }
    return userMockSessions;
  }

  const query = { participants: userId };
  if (statusFilter) query.status = statusFilter;

  return await Session.find(query)
    .populate('participants', '-password')
    .populate('goal', 'title')
    .sort({ date: 1 });
};

export const completeSession = async (sessionId, userId) => {
  const userIdStr = (userId?._id ? userId._id : userId).toString();

  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    const s = mockSessionsStore.find((item) => item._id === sessionId);
    if (!s) throw new ApiError(404, 'Session not found');
    if (!s.participants.includes(userIdStr)) {
      throw new ApiError(403, 'Forbidden: You are not a participant in this session');
    }
    s.status = 'COMPLETED';
    return s;
  }

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new ApiError(404, 'Session not found');
  }

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  const isParticipant = session.participants.some(
    (p) => (p._id ? p._id.toString() : p.toString()) === userIdStr
  );
  if (!isParticipant) {
    throw new ApiError(403, 'Forbidden: You are not a participant in this session');
  }

  if (!session.completedBy) session.completedBy = [];
  if (!session.completedBy.some((id) => id.toString() === userIdStr)) {
    session.completedBy.push(userId);
  }

  // Mark session as completed
  session.status = 'COMPLETED';

  // Update participant statistics
  const hours = (session.durationMinutes || 60) / 60;
  for (const pId of session.participants) {
    const pIdStr = (pId?._id ? pId._id : pId).toString();
    const hostStr = (session.host?._id ? session.host._id : session.host).toString();
    if (pIdStr === hostStr) {
      await User.findByIdAndUpdate(pId, {
        $inc: { sessionsCompleted: 1, hoursTaught: hours, exchangesCompleted: 1 },
      });
    } else {
      await User.findByIdAndUpdate(pId, {
        $inc: { sessionsCompleted: 1, hoursLearned: hours, exchangesCompleted: 1 },
      });
    }
  }

  await session.save();

  const populated = await Session.findById(session._id)
    .populate('participants', 'name email avatar reputation')
    .populate('goal', 'title');

  return populated || session;
};

export const cancelSession = async (sessionId, userId) => {
  const userIdStr = (userId?._id ? userId._id : userId).toString();

  if (process.env.MOCK_DB === 'true' && Session.db?.readyState !== 1) {
    const s = mockSessionsStore.find((item) => item._id === sessionId);
    if (!s) throw new ApiError(404, 'Session not found');
    if (!s.participants.includes(userIdStr)) {
      throw new ApiError(403, 'Forbidden: You are not a participant in this session');
    }
    s.status = 'CANCELLED';
    return s;
  }

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new ApiError(404, 'Session not found');
  }

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  const isParticipant = session.participants.some(
    (p) => (p._id ? p._id.toString() : p.toString()) === userIdStr
  );
  if (!isParticipant) {
    throw new ApiError(403, 'Forbidden: You are not a participant in this session');
  }

  if (session.status === 'COMPLETED') {
    throw new ApiError(400, 'Cannot cancel an already completed session');
  }

  session.status = 'CANCELLED';
  await session.save();
  return session;
};
