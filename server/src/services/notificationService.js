import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';
import { ApiError } from '../utils/apiError.js';

export const NOTIFICATION_TYPE_TO_CATEGORY = {
  SESSION_SCHEDULED: 'sessionUpdates',
  SESSION_COMPLETED: 'sessionUpdates',
  CIRCLE_SESSION_SCHEDULED: 'sessionUpdates',
  GOAL_REMINDER: 'goalReminders',
  CIRCLE_ROADMAP_UPDATE: 'goalReminders',
  MATCH: 'peerActivity',
  REQUEST: 'peerActivity',
  REQUEST_ACCEPTED: 'peerActivity',
  REQUEST_DECLINED: 'peerActivity',
  MESSAGE: 'peerActivity',
  REVIEW_RECEIVED: 'peerActivity',
  CIRCLE_INVITE: 'circleActivity',
  CIRCLE_JOIN_REQUEST: 'circleActivity',
  CIRCLE_REQUEST_ACCEPTED: 'circleActivity',
  CIRCLE_ANNOUNCEMENT: 'circleActivity',
  PLATFORM_ANNOUNCEMENT: 'platformAnnouncements',
};

export const getUserNotifications = async (userId) => {
  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) {
    return [
      {
        _id: 'mock_notif_1',
        recipient: userId,
        type: 'MATCH',
        title: 'New Reciprocal Match Identified',
        message: 'Sarah Chen (UI/UX Specialist) is a 94% fit for your AI SaaS goal.',
        link: '/matches',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return await Notification.find({ recipient: userId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 });
};

export const markAsRead = async (notificationId, userId) => {
  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) return { success: true };

  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw new ApiError(404, 'Notification not found');

  notification.read = true;
  await notification.save();
  return notification;
};

export const markAllAsRead = async (userId) => {
  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) return { success: true };

  await Notification.updateMany({ recipient: userId, read: false }, { read: true });
  return { success: true };
};

/**
 * Creates an in-app notification if the recipient has enabled notifications
 * for the corresponding category in their notificationPreferences.
 */
export const createFilteredNotification = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  link = '',
}) => {
  if (!recipientId || !type || !title || !message) {
    throw new ApiError(400, 'Recipient ID, type, title, and message are required');
  }

  if (process.env.MOCK_DB === 'true' && Notification.db?.readyState !== 1) {
    return {
      created: true,
      notification: {
        _id: 'mock_notif_' + Date.now(),
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        message,
        link,
        read: false,
        createdAt: new Date().toISOString(),
      },
    };
  }

  // Lookup recipient preferences
  const recipient = await User.findById(recipientId).select('notificationPreferences');
  if (!recipient) {
    throw new ApiError(404, 'Recipient user not found');
  }

  const category = NOTIFICATION_TYPE_TO_CATEGORY[type];
  if (category && recipient.notificationPreferences) {
    const isEnabled = recipient.notificationPreferences[category];
    if (isEnabled === false) {
      // Respect opt-out: safely suppress notification without writing to DB
      return {
        created: false,
        suppressed: true,
        category,
        reason: `User opted out of ${category} notifications`,
      };
    }
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    title,
    message,
    link,
  });

  return { created: true, notification };
};

/**
 * Retrieves notification preferences for a user
 */
export const getUserPreferences = async (userId) => {
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return {
      sessionUpdates: true,
      goalReminders: true,
      peerActivity: true,
      circleActivity: true,
      platformAnnouncements: true,
    };
  }

  const user = await User.findById(userId).select('notificationPreferences');
  if (!user) throw new ApiError(404, 'User not found');

  return (
    user.notificationPreferences || {
      sessionUpdates: true,
      goalReminders: true,
      peerActivity: true,
      circleActivity: true,
      platformAnnouncements: true,
    }
  );
};

/**
 * Updates notification preferences for a user
 */
export const updateUserPreferences = async (userId, preferences = {}) => {
  const allowedCategories = [
    'sessionUpdates',
    'goalReminders',
    'peerActivity',
    'circleActivity',
    'platformAnnouncements',
  ];

  const sanitized = {};
  for (const cat of allowedCategories) {
    if (preferences[cat] !== undefined) {
      sanitized[cat] = Boolean(preferences[cat]);
    }
  }

  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return sanitized;
  }

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  user.notificationPreferences = {
    ...(user.notificationPreferences?.toObject?.() || user.notificationPreferences || {}),
    ...sanitized,
  };

  await user.save();
  return user.notificationPreferences;
};

