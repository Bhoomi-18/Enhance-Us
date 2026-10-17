import Session from '../models/sessionModel.js';
import User from '../models/userModel.js';
import Notification from '../models/notificationModel.js';
import { ApiError } from '../utils/apiError.js';

const mockSessionsStore = [];

export const createSession = async (userId, sessionData) => {
  const { connectionId, goalId, recipientId, date, time, durationMinutes, skillTaught, sessionNotes } = sessionData;

  if (process.env.MOCK_DB === 'true') {
    const newMockSession = {
      _id: 'mock_session_' + Date.now(),
      connection: connectionId || 'mock_conn_1',
      goal: goalId || 'mock_goal_1',
      participants: [userId.toString(), (recipientId || 'candidate_user_b').toString()],
      host: userId.toString(),
      date: date || new Date().toISOString(),
      time: time || '14:00',
      durationMinutes: durationMinutes || 60,
      skillTaught: skillTaught || 'React',
      sessionNotes: sessionNotes || 'Initial exchange session',
      status: 'SCHEDULED',
      createdAt: new Date().toISOString(),
    };
    mockSessionsStore.push(newMockSession);
    return newMockSession;
  }

  const session = await Session.create({
    connection: connectionId,
    goal: goalId,
    participants: [userId, recipientId],
    host: userId,
    date,
    time,
    durationMinutes: durationMinutes || 60,
    skillTaught,
    sessionNotes: sessionNotes || '',
    status: 'SCHEDULED',
  });

  // Create notification for recipient
  await Notification.create({
    recipient: recipientId,
    sender: userId,
    type: 'SESSION_SCHEDULED',
    title: 'New Exchange Session Scheduled',
    message: `A new session for ${skillTaught} has been scheduled for ${new Date(date).toLocaleDateString()} at ${time}.`,
    link: `/sessions`,
  });

  return session;
};

export const getUserSessions = async (userId, statusFilter) => {
  if (process.env.MOCK_DB === 'true') {
    let userMockSessions = mockSessionsStore.filter((s) =>
      s.participants.includes(userId.toString())
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
  if (process.env.MOCK_DB === 'true') {
    const s = mockSessionsStore.find((item) => item._id === sessionId);
    if (!s) throw new ApiError(404, 'Session not found');
    if (!s.participants.includes(userId.toString())) {
      throw new ApiError(403, 'Forbidden: You are not a participant in this session');
    }
    s.status = 'COMPLETED';
    return s;
  }

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  const isParticipant = session.participants.some((p) => p.toString() === userId.toString());
  if (!isParticipant) throw new ApiError(403, 'Forbidden: You are not a participant in this session');

  if (!session.completedBy.includes(userId)) {
    session.completedBy.push(userId);
  }

  // If both participants confirm, mark as COMPLETED
  if (session.completedBy.length >= 2 || session.participants.length === 1) {
    session.status = 'COMPLETED';

    // Update participants statistics
    const hours = (session.durationMinutes || 60) / 60;
    for (const pId of session.participants) {
      if (pId.toString() === session.host.toString()) {
        await User.findByIdAndUpdate(pId, {
          $inc: { sessionsCompleted: 1, hoursTaught: hours, exchangesCompleted: 1 },
        });
      } else {
        await User.findByIdAndUpdate(pId, {
          $inc: { sessionsCompleted: 1, hoursLearned: hours, exchangesCompleted: 1 },
        });
      }
    }
  }

  await session.save();
  return session;
};

export const cancelSession = async (sessionId, userId) => {
  if (process.env.MOCK_DB === 'true') {
    const s = mockSessionsStore.find((item) => item._id === sessionId);
    if (!s) throw new ApiError(404, 'Session not found');
    if (!s.participants.includes(userId.toString())) {
      throw new ApiError(403, 'Forbidden: You are not a participant in this session');
    }
    s.status = 'CANCELLED';
    return s;
  }

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found');

  const isParticipant = session.participants.some((p) => p.toString() === userId.toString());
  if (!isParticipant) throw new ApiError(403, 'Forbidden: You are not a participant in this session');

  session.status = 'CANCELLED';
  await session.save();
  return session;
};
